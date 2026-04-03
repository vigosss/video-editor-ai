// ==========================================
// 抖音视频上传 — 真实 API 实现（分片上传）
// ==========================================

import { statSync, readFileSync } from 'fs'
import { basename } from 'path'
import { DOUYIN_UPLOAD_CONFIG } from '../../shared/platform'
import type { OAuthToken } from '../../shared/platform'
import type { PublishParams } from '../../shared/upload'
import { getPlatformCredentials } from './oauth-credentials'

/** 抖音分片上传分片大小：20MB */
const PART_SIZE = 20 * 1000 * 1000

/** 单分片上传最大重试次数 */
const MAX_RETRY = 3

/** 上传进度回调 */
type ProgressCallback = (progress: number, message: string) => void

/**
 * 抖音完整上传流程
 * 1. 初始化分片上传 → 获取 upload_id
 * 2. 分片上传 → 逐片上传二进制数据
 * 3. 完成分片上传 → 获取 video_id
 * 4. 创建视频 → 标题 + video_id → 获取 item_id
 */
export async function uploadToDouyin(
  token: OAuthToken,
  params: PublishParams,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<{ videoId: string; videoUrl: string }> {
  const credentials = getPlatformCredentials('douyin')
  if (!credentials) {
    throw new Error('抖音平台凭证未配置')
  }

  const videoPath = params.videoPath!
  if (!videoPath) throw new Error('视频路径未设置')
  const fileSize = statSync(videoPath).size

  // ==========================================
  // 步骤1: 初始化分片上传
  // ==========================================
  onProgress(5, '正在初始化抖音分片上传...')

  const initRes = await fetchWithRetry(DOUYIN_UPLOAD_CONFIG.partInit, {
    method: 'POST',
    headers: {
      'access-token': token.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_size: fileSize }),
  })

  if (!initRes.ok) {
    throw new Error(`抖音初始化分片上传失败: HTTP ${initRes.status}`)
  }

  const initData = await initRes.json() as DouyinInitResponse

  // 抖音 API 返回格式: { data: { ... }, extra: { error_code: 0, ... } }
  const extraError = initData.extra?.error_code ?? initData.data?.error_code
  if (extraError && extraError !== 0) {
    const desc = initData.extra?.description || initData.data?.description || JSON.stringify(initData)
    throw new Error(`抖音初始化分片上传失败: ${desc}`)
  }

  const uploadId = initData.data?.upload_id
  if (!uploadId) {
    throw new Error('抖音初始化分片上传返回数据异常: 缺少 upload_id')
  }

  console.log(`[douyin] 初始化分片上传成功: upload_id=${uploadId}`)

  // ==========================================
  // 步骤2: 分片上传
  // ==========================================
  const totalParts = Math.ceil(fileSize / PART_SIZE)

  console.log(`[douyin] 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB, 分片数: ${totalParts}`)

  for (let i = 0; i < totalParts; i++) {
    if (signal.aborted) throw new Error('上传已取消')

    const start = i * PART_SIZE
    const end = Math.min(start + PART_SIZE, fileSize)

    const progress = 10 + Math.round((i / totalParts) * 70)
    onProgress(progress, `正在上传视频分片 ${i + 1}/${totalParts}...`)

    // 读取分片数据
    const partData = readPart(videoPath, start, end)
    const partNumber = i + 1 // 抖音分片从1开始

    // 上传分片（带重试）
    let uploaded = false
    for (let retry = 0; retry < MAX_RETRY; retry++) {
      if (signal.aborted) throw new Error('上传已取消')

      try {
        // 注意：upload_id 作为 URL 参数需要 encode
        const uploadUrl = `${DOUYIN_UPLOAD_CONFIG.partUpload}?upload_id=${encodeURIComponent(uploadId)}&part_number=${partNumber}`

        const formData = new FormData()
        const blob = new Blob([partData as unknown as BlobPart])
        formData.append('video', blob, basename(videoPath))

        const partRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'access-token': token.accessToken,
          },
          body: formData,
        })

        if (!partRes.ok) {
          const errText = await partRes.text()
          throw new Error(`HTTP ${partRes.status}: ${errText}`)
        }

        const partRespData = await partRes.json() as DouyinPartUploadResponse

        const partError = partRespData.extra?.error_code ?? partRespData.data?.error_code
        if (partError && partError !== 0) {
          const desc = partRespData.extra?.description || partRespData.data?.description || JSON.stringify(partRespData)
          throw new Error(desc)
        }

        console.log(`[douyin] 分片 ${partNumber}/${totalParts} 上传成功`)
        uploaded = true
        break
      } catch (err) {
        console.warn(`[douyin] 分片 ${partNumber} 上传失败 (重试 ${retry + 1}/${MAX_RETRY}): ${(err as Error).message}`)
        if (retry === MAX_RETRY - 1) {
          throw new Error(`抖音分片 ${partNumber} 上传失败，已重试 ${MAX_RETRY} 次: ${(err as Error).message}`)
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retry + 1)))
      }
    }

    if (!uploaded) {
      throw new Error(`抖音分片 ${partNumber} 上传失败`)
    }
  }

  // ==========================================
  // 步骤3: 完成分片上传
  // ==========================================
  if (signal.aborted) throw new Error('上传已取消')

  onProgress(85, '正在合并分片...')

  const completeRes = await fetchWithRetry(DOUYIN_UPLOAD_CONFIG.partComplete, {
    method: 'POST',
    headers: {
      'access-token': token.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      upload_id: uploadId,
    }),
  })

  if (!completeRes.ok) {
    throw new Error(`抖音完成分片上传失败: HTTP ${completeRes.status}`)
  }

  const completeData = await completeRes.json() as DouyinCompleteResponse

  const completeError = completeData.extra?.error_code ?? completeData.data?.error_code
  if (completeError && completeError !== 0) {
    const desc = completeData.extra?.description || completeData.data?.description || JSON.stringify(completeData)
    throw new Error(`抖音完成分片上传失败: ${desc}`)
  }

  const videoId = completeData.data?.video_id
  if (!videoId) {
    throw new Error('抖音完成分片上传返回数据异常: 缺少 video_id')
  }

  console.log(`[douyin] 分片合并完成: video_id=${videoId}`)

  // ==========================================
  // 步骤4: 创建视频
  // ==========================================
  if (signal.aborted) throw new Error('上传已取消')

  onProgress(92, '正在创建视频...')

  const createBody: Record<string, string> = {
    video_id: videoId,
    text: params.title,
  }

  // 如果有描述，添加到 text 中
  if (params.description) {
    createBody.text = `${params.title}\n${params.description}`
  }

  const createRes = await fetchWithRetry(DOUYIN_UPLOAD_CONFIG.createVideo, {
    method: 'POST',
    headers: {
      'access-token': token.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createBody),
  })

  if (!createRes.ok) {
    throw new Error(`抖音创建视频失败: HTTP ${createRes.status}`)
  }

  const createData = await createRes.json() as DouyinCreateResponse

  const createError = createData.extra?.error_code ?? createData.data?.error_code
  if (createError && createError !== 0) {
    const desc = createData.extra?.description || createData.data?.description || JSON.stringify(createData)
    throw new Error(`抖音创建视频失败: ${desc}`)
  }

  const itemId = createData.data?.item_id || videoId

  console.log(`[douyin] 视频创建成功: item_id=${itemId}`)

  onProgress(100, '抖音视频发布完成！')

  return {
    videoId: itemId,
    videoUrl: '', // 抖音创建视频不直接返回播放地址，需要通过查询视频状态获取
  }
}

// ==========================================
// 类型定义
// ==========================================

interface DouyinBaseResponse {
  data?: {
    error_code?: number
    description?: string
  }
  extra?: {
    error_code?: number
    description?: string
    sub_error_code?: number
    sub_description?: string
    logid?: string
    now?: number
  }
}

interface DouyinInitResponse extends DouyinBaseResponse {
  data?: {
    error_code?: number
    description?: string
    upload_id?: string
  }
}

interface DouyinPartUploadResponse extends DouyinBaseResponse {
  data?: {
    error_code?: number
    description?: string
  }
}

interface DouyinCompleteResponse extends DouyinBaseResponse {
  data?: {
    error_code?: number
    description?: string
    video_id?: string
  }
}

interface DouyinCreateResponse extends DouyinBaseResponse {
  data?: {
    error_code?: number
    description?: string
    item_id?: string
  }
}

// ==========================================
// 辅助函数
// ==========================================

/** 读取文件指定范围的字节 */
function readPart(filePath: string, start: number, end: number): Uint8Array {
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