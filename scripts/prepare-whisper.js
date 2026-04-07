#!/usr/bin/env node
/**
 * Whisper CLI 预处理脚本
 * 从 whisper.cpp GitHub Releases 下载预编译的 whisper-cli 二进制文件
 * 复制到 resources/whisper/ 目录，用于 electron-builder 打包时作为 extraResources 包含
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const https = require('follow-redirects').https
const http = require('follow-redirects').http
const { URL } = require('url')

const RESOURCES_WHISPER_DIR = path.join(__dirname, '..', 'resources', 'whisper')
const WHISPER_VERSION = '1.8.4'

// 多源下载配置（按优先级排列）
const DOWNLOAD_SOURCES = {
  win32_x64: [
    `https://ghfast.top/https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-x64.zip`,
    `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-x64.zip`,
  ],
  darwin_arm64: [
    `https://ghfast.top/https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-v${WHISPER_VERSION}-xcframework.zip`,
    `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-v${WHISPER_VERSION}-xcframework.zip`,
  ],
  darwin_x64: [
    `https://ghfast.top/https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-v${WHISPER_VERSION}-xcframework.zip`,
    `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-v${WHISPER_VERSION}-xcframework.zip`,
  ],
  linux_x64: [
    `https://ghfast.top/https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-x64.zip`,
    `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-x64.zip`,
  ],
}

function getPlatformKey() {
  const platform = process.platform
  const arch = process.arch
  return `${platform}_${arch}`
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const httpModule = parsedUrl.protocol === 'https:' ? https : http

    console.log(`[prepare-whisper] 下载: ${url}`)

    const request = httpModule.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
      let downloadedBytes = 0

      const file = fs.createWriteStream(destPath)
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length
        if (totalBytes > 0) {
          const pct = Math.round((downloadedBytes / totalBytes) * 100)
          process.stdout.write(`\r[prepare-whisper] 进度: ${pct}% (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB)`)
        }
      })

      response.pipe(file)
      file.on('finish', () => {
        file.close(() => {
          process.stdout.write('\n')
          resolve()
        })
      })

      file.on('error', (err) => {
        fs.unlinkSync(destPath)
        reject(err)
      })
    })

    request.on('error', reject)
    request.setTimeout(10 * 60 * 1000, () => {
      request.destroy()
      reject(new Error('下载超时'))
    })
  })
}

function findWhisperBinary(extractDir) {
  // 优先查找 whisper-cli，不要匹配 main（main 是弃用警告包装器）
  const isWin = process.platform === 'win32'

  function searchDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const result = searchDir(fullPath)
        if (result) return result
      } else if (entry.name === 'whisper-cli' || entry.name === 'whisper-cli.exe') {
        return fullPath
      }
    }
    return null
  }

  return searchDir(extractDir)
}

async function prepareWhisper() {
  console.log('[prepare-whisper] 开始准备 Whisper CLI 二进制文件...')

  // 确保 resources/whisper 目录存在
  if (!fs.existsSync(RESOURCES_WHISPER_DIR)) {
    fs.mkdirSync(RESOURCES_WHISPER_DIR, { recursive: true })
  }

  const isWin = process.platform === 'win32'
  const ext = isWin ? '.exe' : ''
  const targetBin = path.join(RESOURCES_WHISPER_DIR, `whisper-cli${ext}`)

  // 如果已经存在，跳过
  if (fs.existsSync(targetBin)) {
    const stats = fs.statSync(targetBin)
    if (stats.size > 1024 * 100) { // 至少 100KB
      console.log(`[prepare-whisper] ✅ whisper-cli 已存在: ${targetBin}`)
      return
    }
  }

  const platformKey = getPlatformKey()
  const sources = DOWNLOAD_SOURCES[platformKey]

  if (!sources) {
    console.warn(`[prepare-whisper] ⚠️ 不支持的平台: ${platformKey}，跳过下载`)
    console.warn('[prepare-whisper] 请手动下载 whisper-cli 并放置到 resources/whisper/ 目录')
    return
  }

  // 尝试多源下载
  let lastError = null
  for (let i = 0; i < sources.length; i++) {
    const url = sources[i]
    const hostname = new URL(url).hostname
    console.log(`[prepare-whisper] 尝试源 ${i + 1}/${sources.length}: ${hostname}`)

    try {
      // 创建临时目录
      const tempDir = path.join(RESOURCES_WHISPER_DIR, '_temp_download')
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
      fs.mkdirSync(tempDir, { recursive: true })

      const zipPath = path.join(tempDir, 'whisper.zip')

      // 下载
      await downloadFile(url, zipPath)

      if (!fs.existsSync(zipPath)) {
        throw new Error('下载完成但文件不存在')
      }

      // 解压
      console.log('[prepare-whisper] 解压中...')
      try {
        if (isWin) {
          // Windows 使用 PowerShell 解压
          execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`, {
            stdio: 'pipe',
            timeout: 60000,
          })
        } else {
          // macOS/Linux 使用 unzip
          execSync(`unzip -o "${zipPath}" -d "${tempDir}"`, {
            stdio: 'pipe',
            timeout: 60000,
          })
        }
      } catch (err) {
        throw new Error(`解压失败: ${err.message}`)
      }

      // 查找 whisper-cli 二进制
      const binPath = findWhisperBinary(tempDir)
      if (!binPath) {
        throw new Error('解压后未找到 whisper-cli 二进制文件')
      }

      // 复制 whisper-cli 到目标位置
      fs.copyFileSync(binPath, targetBin)
      if (!isWin) {
        fs.chmodSync(targetBin, 0o755)
      }

      // Windows 还需要复制 DLL 文件（whisper.dll, ggml.dll, ggml-cpu.dll, ggml-base.dll, SDL2.dll）
      if (isWin) {
        const binDir = path.dirname(binPath)
        const requiredDlls = ['whisper.dll', 'ggml.dll', 'ggml-cpu.dll', 'ggml-base.dll', 'SDL2.dll']
        for (const dll of requiredDlls) {
          const srcDll = path.join(binDir, dll)
          if (fs.existsSync(srcDll)) {
            const destDll = path.join(RESOURCES_WHISPER_DIR, dll)
            fs.copyFileSync(srcDll, destDll)
            console.log(`[prepare-whisper] 已复制: ${dll}`)
          }
        }
      }

      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true })

      console.log(`[prepare-whisper] ✅ whisper-cli 已准备: ${targetBin}`)
      return
    } catch (err) {
      console.warn(`[prepare-whisper] 源 ${hostname} 失败: ${err.message}`)
      lastError = err
    }
  }

  console.error(`[prepare-whisper] ❌ 所有下载源均失败: ${lastError?.message}`)
  console.error('[prepare-whisper] 请手动下载 whisper-cli 并放置到 resources/whisper/ 目录')
  console.error(`[prepare-whisper] 下载地址: https://github.com/ggml-org/whisper.cpp/releases/tag/v${WHISPER_VERSION}`)
  process.exit(1)
}

prepareWhisper()
