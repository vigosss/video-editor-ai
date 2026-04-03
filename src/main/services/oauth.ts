// ==========================================
// OAuth 授权服务 — 纯客户端实现
// ==========================================

import http from 'http'
import { shell, BrowserWindow } from 'electron'
import { PLATFORM_CONFIGS } from '../../shared/platform'
import type { UploadPlatform } from '../../shared/upload'
import type { OAuthToken } from '../../shared/platform'
import { savePlatformToken, getPlatformToken, deletePlatformToken, getPlatformAuthStatus } from './database'
import { getPlatformCredentials } from './oauth-credentials'

/** OAuth 回调端口 */
const OAUTH_PORT = 9527

/** 当前活跃的 OAuth 服务器 */
let activeServer: http.Server | null = null
let pendingPlatform: UploadPlatform | null = null

/**
 * 发起平台授权
 * 1. 启动本地 HTTP Server 监听回调
 * 2. 打开系统浏览器跳转授权页
 * 3. 等待用户授权完成
 * 4. 用 code 换取 access_token
 */
export async function authorizePlatform(platform: UploadPlatform): Promise<{ authorized: boolean; error?: string }> {
  const config = PLATFORM_CONFIGS[platform]
  if (!config) {
    return { authorized: false, error: `不支持的平台: ${platform}` }
  }

  // 关闭可能存在的旧服务器
  await closeServer()

  try {
    // 获取平台凭证（Client Key / Secret）
    const credentials = getPlatformCredentials(platform)
    if (!credentials) {
      return { authorized: false, error: `${config.name}平台凭证尚未配置，请联系管理员` }
    }

    // 启动本地回调服务器
    pendingPlatform = platform
    const { code } = await startCallbackServer()

    // 用 code 换取 token
    const token = await exchangeToken(platform, code, credentials)

    // 加密保存 token
    savePlatformToken(platform, token)

    pendingPlatform = null
    return { authorized: true }
  } catch (err) {
    pendingPlatform = null
    const msg = err instanceof Error ? err.message : '授权失败'
    console.error(`[oauth] ${platform} 授权失败:`, msg)
    return { authorized: false, error: msg }
  } finally {
    await closeServer()
  }
}

/**
 * 取消平台授权
 */
export async function revokePlatformAuth(platform: UploadPlatform): Promise<void> {
  deletePlatformToken(platform)
  console.log(`[oauth] ${platform} 授权已取消`)
}

/**
 * 检查平台授权状态
 */
export function checkPlatformAuth(platform: UploadPlatform) {
  return getPlatformAuthStatus(platform)
}

/**
 * 获取有效的 Token（自动刷新）
 */
export async function getValidToken(platform: UploadPlatform): Promise<OAuthToken | null> {
  const token = getPlatformToken(platform)
  if (!token) return null

  // 检查是否过期
  const obtainedAt = new Date(token.obtainedAt).getTime()
  const expiresAt = obtainedAt + token.expiresIn * 1000

  if (Date.now() < expiresAt) {
    return token
  }

  // 尝试刷新 token
  const credentials = getPlatformCredentials(platform)
  if (!credentials || !token.refreshToken) {
    deletePlatformToken(platform)
    return null
  }

  try {
    const newToken = await refreshToken(platform, token.refreshToken, credentials)
    savePlatformToken(platform, newToken)
    return newToken
  } catch (err) {
    console.error(`[oauth] ${platform} token 刷新失败:`, err)
    deletePlatformToken(platform)
    return null
  }
}

// ==========================================
// 内部实现
// ==========================================

/** 启动本地回调 HTTP Server */
function startCallbackServer(): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) return

      const url = new URL(req.url, `http://localhost:${OAUTH_PORT}`)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
          <html>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;margin:0">
              <div style="text-align:center">
                <h2>✅ 授权成功！</h2>
                <p>请返回「老兵AI智剪」应用继续操作</p>
                <p style="color:#999;font-size:12px">此窗口可安全关闭</p>
              </div>
              <script>window.close()</script>
            </body>
          </html>
        `)
        resolve({ code })
      } else if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<html><body><h2>❌ 授权失败: ${error}</h2><p>请返回应用重试</p></body></html>`)
        reject(new Error(`用户拒绝授权: ${error}`))
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    server.listen(OAUTH_PORT, () => {
      console.log(`[oauth] 本地回调服务器已启动: http://localhost:${OAUTH_PORT}`)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${OAUTH_PORT} 已被占用，请关闭占用该端口的程序后重试`))
      } else {
        reject(err)
      }
    })

    activeServer = server

    // 打开浏览器授权页
    if (pendingPlatform) {
      const config = PLATFORM_CONFIGS[pendingPlatform]
      const credentials = getPlatformCredentials(pendingPlatform)
      if (credentials) {
        const authUrl = `${config.authUrl}?app_id=${credentials.clientKey}&redirect_uri=http://localhost:${OAUTH_PORT}&response_type=code&scope=${config.scope}`
        shell.openExternal(authUrl)
      }
    }

    // 超时处理（5 分钟）
    setTimeout(() => {
      closeServer()
      reject(new Error('授权超时，请重试'))
    }, 5 * 60 * 1000)
  })
}

/** 用授权码换取 Token */
async function exchangeToken(platform: UploadPlatform, code: string, credentials: { clientKey: string; clientSecret: string }): Promise<OAuthToken> {
  const config = PLATFORM_CONFIGS[platform]

  // 实际 API 调用 — 凭证填入后生效
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_key: credentials.clientKey,
      client_secret: credentials.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `http://localhost:${OAUTH_PORT}`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token 换取失败: HTTP ${response.status}`)
  }

  const data = await response.json()

  // 不同平台的响应结构可能不同，这里做通用适配
  const tokenData = data.data || data.access_token ? data : data

  return {
    accessToken: tokenData.access_token || tokenData.accessToken,
    refreshToken: tokenData.refresh_token || tokenData.refreshToken,
    expiresIn: tokenData.expires_in || tokenData.expiresIn || 86400,
    openId: tokenData.open_id || tokenData.openId,
    scope: tokenData.scope,
    obtainedAt: new Date().toISOString(),
  }
}

/** 刷新 Token */
async function refreshToken(platform: UploadPlatform, refreshToken: string, credentials: { clientKey: string; clientSecret: string }): Promise<OAuthToken> {
  const config = PLATFORM_CONFIGS[platform]

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_key: credentials.clientKey,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Token 刷新失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const tokenData = data.data || data

  return {
    accessToken: tokenData.access_token || tokenData.accessToken,
    refreshToken: tokenData.refresh_token || refreshToken,
    expiresIn: tokenData.expires_in || tokenData.expiresIn || 86400,
    openId: tokenData.open_id || tokenData.openId,
    scope: tokenData.scope,
    obtainedAt: new Date().toISOString(),
  }
}

/** 关闭活跃的 HTTP Server */
async function closeServer(): Promise<void> {
  if (activeServer) {
    return new Promise((resolve) => {
      activeServer!.close(() => {
        activeServer = null
        resolve()
      })
    })
  }
}

