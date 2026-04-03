// ==========================================
// 快手视频上传 — 真实 API 实现（分片上传）
// ==========================================

import { createReadStream, statSync, readFileSync } from 'fs'
import { basename } from 'path'
import { KUAISHOU_UPLOAD_CONFIG } from '../../shared/platform'
import type { OAuthToken } from '../../shared/platform'
import type { PublishParams } from '../../shared/upload'
import { getPlatformCredentials } from './oauth-credentials'

/** 快手分片上传分片大小：10MB */
const FRAGMENT_SIZE = 10 * 1000 * 1000

/** 单分片上传最大重试次数 */
const MAX_RETRY = 3

/** 上传进度回调 */
type ProgressCallback = (progress: number, message: string) => void

/**
 * 快手完整上传流程
 * 1. 发起上传 → 获取 upload_token + endpoint
 * 2. 分片上传 → 逐片上传二进制数据
 * 3. 完成上传 → 合并分片
 * 4. 发布视频 → 标题 + 封面 → 获取 photo_id
 */
export async function uploadToKuaishou(
  token: OAuthToken,
  params: PublishParams,
  coverPath: string,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<{ videoId: string; videoUrl: string }> {
  const credentials = getPlatformCredentials('kuaishou')
  if (!credentials) {
    throw new Error('快手平台凭证未配置')
  }

  const videoPath = params.videoPath!
  if (!videoPath) throw new Error('视频路径未设置')
  const fileSize = statSync(videoPath).size

  // ==========================================
  // 步骤1: 发起上传
  // ==========================================
  onProgress(5, '正在发起快手上传...')

  const startUrl = `${KUAISHOU_UPLOAD_CONFIG.startUpload}?access_token=${encodeURIComponent(token.accessToken)}&app_id=${credentials.clientKey}`

  const startRes = await fetchWithRetry(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!startRes.ok) {
    throw new Error(`快手发起上传失败: HTTP ${startRes.status}`)
  }

  const startData = await startRes.json() as KuaishouStartResponse

  if (startData.result !== 1) {
    throw new Error(`快手发起上传失败: ${startData.error_msg || JSON.stringify(startData)}`)
  }

  const uploadToken = startData.upload_token
  const endpoint = startData.endpoint

  if (!uploadToken || !endpoint) {
    throw new Error('快手发起上传返回数据异常: 缺少 upload_token 或 endpoint')
  }

  console.log(`[kuaishou] 发起上传成功: upload_token=${uploadToken}, endpoint=${endpoint}`)

  // ==========================================
  // 步骤2: 分片上传
  // ==========================================
  const fragmentCount = Math.ceil(fileSize / FRAGMENT_SIZE)

  console.log(`[kuaishou] 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB, 分片数: ${fragmentCount}`)

  for (let i = 0; i < fragmentCount; i++) {
    if (signal.aborted) throw new Error('上传已取消')

    const start = i * FRAGMENT_SIZE
    const end = Math.min(start + FRAGMENT_SIZE, fileSize)

    const progress = 10 + Math.round((i / fragmentCount) * 70)
    onProgress(progress, `正在上传视频分片 ${i + 1}/${fragmentCount}...`)

    // 读取分片数据
    const fragmentData = readFragment(videoPath, start, end)

    // 上传分片（带重试）
    let uploaded = false
    for (let retry = 0; retry < MAX_RETRY; retry++) {
      if (signal.aborted) throw new Error('上传已取消')

      try {
        const fragUrl = `http://${endpoint}${KUAISHOU_UPLOAD_CONFIG.fragmentUpload}?upload_token=${encodeURIComponent(uploadToken)}&fragment_id=${i}`

        const fragRes = await fetch(fragUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'video/mp4',
          },
          body: fragmentData as unknown as BodyInit,
        })

        if (!fragRes.ok) {
          const errText = await fragRes.text()
          throw new Error(`HTTP ${fragRes.status}: ${errText}`)
        }

        const fragData = await fragRes.json() as KuaishouFragmentResponse

        if (fragData.result !== 1) {
          throw new Error(fragData.error_msg || JSON.stringify(fragData))
        }

        console.log(`[kuaishou] 分片 ${i + 1}/${fragmentCount} 上传成功, checksum=${fragData.checksum}, size=${fragData.size}`)
        uploaded = true
        break
      } catch (err) {
        console.warn(`[kuaishou] 分片 ${i + 1} 上传失败 (重试 ${retry + 1}/${MAX_RETRY}): ${(err as Error).message}`)
        if (retry === MAX_RETRY - 1) {
          throw new Error(`快手分片 ${i + 1} 上传失败，已重试 ${MAX_RETRY} 次: ${(err as Error).message}`)
        }
        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retry + 1)))
      }
    }

    if (!uploaded) {
      throw new Error(`快手分片 ${i + 1} 上传失败`)
    }
  }

  // ==========================================
  // 步骤3: 完成分片上传
  // ==========================================
  if (signal.aborted) throw new Error('上传已取消')

  onProgress(85, '正在合并分片...')

  const completeUrl = `http://${endpoint}${KUAISHOU_UPLOAD_CONFIG.completeUpload}?upload_token=${encodeURIComponent(uploadToken)}&fragment_count=${fragmentCount}`

  const completeRes = await fetchWithRetry(completeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!completeRes.ok) {
    throw new Error(`快手完成上传失败: HTTP ${completeRes.status}`)
  }

  const completeData = await completeRes.json() as { result: number; error_msg?: string }

  if (completeData.result !== 1) {
    throw new Error(`快手完成上传失败: ${completeData.error_msg || JSON.stringify(completeData)}`)
  }

  console.log(`[kuaishou] 分片合并完成`)

  // ==========================================
  // 步骤4: 发布视频
  // ==========================================
  if (signal.aborted) throw new Error('上传已取消')

  onProgress(90, '正在发布视频...')

  const publishUrl = `${KUAISHOU_UPLOAD_CONFIG.publishVideo}?access_token=${encodeURIComponent(token.accessToken)}&app_id=${credentials.clientKey}&upload_token=${encodeURIComponent(uploadToken)}`

  // 构建 multipart/form-data
  const formData = new FormData()

  // 封面
  if (coverPath) {
    try {
      const coverBuffer = readFileSync(coverPath)
      const coverBlob = new Blob([new Uint8Array(coverBuffer)])
      formData.append('cover', coverBlob, 'cover.jpg')
    } catch (err) {
      console.warn(`[kuaishou] 封面读取失败，跳过: ${(err as Error).message}`)
    }
  }

  // 标题
  formData.append('caption', params.title)

  const publishRes = await fetchWithRetry(publishUrl, {
    method: 'POST',
    body: formData,
  })

  if (!publishRes.ok) {
    throw new Error(`快手发布视频失败: HTTP ${publishRes.status}`)
  }

  const publishData = await publishRes.json() as KuaishouPublishResponse

  if (publishData.result !== 1) {
    throw new Error(`快手发布视频失败: ${publishData.error_msg || JSON.stringify(publishData)}`)
  }

  const videoInfo = publishData.video_info || { photo_id: '', play_url: '' }
  const photoId = videoInfo.photo_id || uploadToken
  const playUrl = videoInfo.play_url || ''

  console.log(`[kuaishou] 视频发布成功: photo_id=${photoId}`)

  onProgress(100, '快手视频发布完成！')

  return {
    videoId: photoId,
    videoUrl: playUrl,
  }
}

// ==========================================
// 类型定义
// ==========================================

interface KuaishouStartResponse {
  result: number
  upload_token: string
  endpoint: string
  error_msg?: string
}

interface KuaishouFragmentResponse {
  result: number
  checksum: string
  size: number
  error_msg?: string
}

interface KuaishouPublishResponse {
  result: number
  error_msg?: string
  video_info?: {
    photo_id: string
    caption: string
    cover: string
    play_url: string
    create_time: number
    like_count: number
    comment_count: number
    view_count: number
    pending: boolean
  }
}

// ==========================================
// 辅助函数
// ==========================================

/** 读取文件指定范围的字节 */
function readFragment(filePath: string, start: number, end: number): Uint8Array {
  const buffer = Buffer.alloc(end - start)
  const fd = require('fs').openSync(filePath, 'r')
  try {
    require('fs').readSync(fd, buffer, 0, end - start, start)
  } finally {
    require('fs').closeSync(fd)
  }
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

/** 带重试的 fetch */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (err) {
      lastError = err as Error
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw lastError!
}