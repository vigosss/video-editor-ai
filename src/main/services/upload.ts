// ==========================================
// 上传服务 — 平台接口 + 实现
// ==========================================

import { BrowserWindow } from 'electron'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { PLATFORM_CONFIGS } from '../../shared/platform'
import type { UploadPlatform, UploadRecord, PublishParams, UploadProgress } from '../../shared/upload'
import type { OAuthToken } from '../../shared/platform'
import {
  createUploadRecord,
  updateUploadRecord,
  getUploadRecord,
  getUploadsByProject,
  getProject,
} from './database'
import { getValidToken } from './oauth'
import { uploadToKuaishou } from './upload-kuaishou'
import { uploadToDouyin } from './upload-douyin'
import ffmpeg from 'fluent-ffmpeg'
import { getFfmpegPath, getTempDir } from '../utils/paths'

/** 上传进度回调 */
type ProgressCallback = (progress: UploadProgress) => void

/** 当前活跃的上传任务 */
const activeUploads = new Map<string, AbortController>()

/**
 * 开始上传视频到平台
 */
export async function startVideoUpload(
  params: PublishParams,
  onProgress: ProgressCallback,
): Promise<UploadRecord> {
  const { platform, projectId } = params
  const config = PLATFORM_CONFIGS[platform]

  // ==========================================
  // 1. 获取视频路径
  // ==========================================
  let videoPath = params.videoPath

  // 如果没有直接传 videoPath，从项目数据库获取 outputPath
  if (!videoPath) {
    const project = getProject(projectId)
    if (!project) {
      throw new Error(`项目不存在: ${projectId}`)
    }
    videoPath = project.outputPath
  }

  if (!videoPath || !existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath || '未设置输出路径'}`)
  }

  // 更新 params 中的 videoPath
  params.videoPath = videoPath

  // ==========================================
  // 2. 创建上传记录
  // ==========================================
  const record = createUploadRecord(
    projectId,
    platform,
    params.title,
    params.description,
    params.tags,
    params.coverPath ?? '',
  )

  // ==========================================
  // 3. 获取有效 Token
  // ==========================================
  const token = await getValidToken(platform)
  if (!token) {
    updateUploadRecord(record.id, {
      status: 'failed',
      errorMessage: `${config.name} 未授权或授权已过期，请先在设置中完成授权`,
    })
    return getUploadRecord(record.id)!
  }

  // ==========================================
  // 4. 创建取消控制器
  // ==========================================
  const abortController = new AbortController()
  activeUploads.set(record.id, abortController)

  try {
    // 更新状态为上传中
    updateUploadRecord(record.id, { status: 'uploading' })
    onProgress({
      platform,
      projectId,
      progress: 0,
      message: '正在准备上传...',
      status: 'uploading',
    })

    // ==========================================
    // 5. 生成封面（快手需要）
    // ==========================================
    let coverPath = params.coverPath || ''
    if (!coverPath && platform === 'kuaishou') {
      try {
        coverPath = await generateCover(videoPath, projectId)
        console.log(`[upload] 自动生成封面: ${coverPath}`)
      } catch (err) {
        console.warn(`[upload] 封面生成失败，继续上传: ${(err as Error).message}`)
      }
    }

    // ==========================================
    // 6. 执行平台上传
    // ==========================================
    const progressFn = (progress: number, message: string) => {
      if (abortController.signal.aborted) return
      updateUploadRecord(record.id, { status: 'uploading' })
      onProgress({
        platform,
        projectId,
        progress,
        message,
        status: 'uploading',
      })
    }

    let result: { videoId: string; videoUrl: string }

    switch (platform) {
      case 'kuaishou':
        result = await uploadToKuaishou(
          token,
          params,
          coverPath,
          progressFn,
          abortController.signal,
        )
        break

      case 'douyin':
        result = await uploadToDouyin(
          token,
          params,
          progressFn,
          abortController.signal,
        )
        break

      default:
        throw new Error(`不支持的平台: ${platform}`)
    }

    // ==========================================
    // 7. 更新为成功
    // ==========================================
    updateUploadRecord(record.id, {
      status: 'completed',
      videoId: result.videoId,
      videoUrl: result.videoUrl,
      uploadedAt: new Date().toISOString(),
    })

    onProgress({
      platform,
      projectId,
      progress: 100,
      message: '上传完成！',
      status: 'completed',
    })

    return getUploadRecord(record.id)!
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上传失败'

    if (abortController.signal.aborted) {
      updateUploadRecord(record.id, {
        status: 'failed',
        errorMessage: '上传已取消',
      })
    } else {
      updateUploadRecord(record.id, {
        status: 'failed',
        errorMessage: msg,
      })
    }

    onProgress({
      platform,
      projectId,
      progress: 0,
      message: msg,
      status: 'failed',
    })

    return getUploadRecord(record.id)!
  } finally {
    activeUploads.delete(record.id)
  }
}

/**
 * 取消上传
 */
export async function cancelUpload(projectId: string, platform: UploadPlatform): Promise<void> {
  // 找到该项目该平台的活跃上传任务
  for (const [id, controller] of activeUploads.entries()) {
    const record = getUploadRecord(id)
    if (record && record.projectId === projectId && record.platform === platform) {
      controller.abort()
      activeUploads.delete(id)
      break
    }
  }
}

/**
 * 重试上传
 */
export async function retryUpload(
  uploadId: string,
  onProgress: ProgressCallback,
): Promise<UploadRecord> {
  const record = getUploadRecord(uploadId)
  if (!record) {
    throw new Error(`上传记录不存在: ${uploadId}`)
  }

  if (record.status !== 'failed') {
    throw new Error('只能重试失败的上传记录')
  }

  // 用原记录的参数重新上传
  const params: PublishParams = {
    projectId: record.projectId,
    platform: record.platform,
    title: record.title,
    description: record.description,
    tags: record.tags,
    coverPath: record.coverPath || undefined,
    videoPath: '', // 将在 startVideoUpload 中从项目获取
  }

  // 创建新的上传
  return startVideoUpload(params, onProgress)
}

/**
 * 获取项目的上传记录
 */
export function getProjectUploadRecords(projectId: string): UploadRecord[] {
  return getUploadsByProject(projectId)
}

// ==========================================
// 封面生成（从视频截取第一帧）
// ==========================================

/**
 * 从视频截取第一帧作为封面
 * @param videoPath 视频文件路径
 * @param projectId 项目ID（用于临时文件命名）
 * @returns 封面图片路径
 */
async function generateCover(videoPath: string, projectId: string): Promise<string> {
  const tempDir = getTempDir()
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }

  const coverPath = join(tempDir, `cover_${projectId}.jpg`)

  // 如果已存在则删除
  if (existsSync(coverPath)) {
    unlinkSync(coverPath)
  }

  const ffmpegPath = getFfmpegPath()

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setFfmpegPath(ffmpegPath)
      .screenshots({
        timestamps: ['00:00:01'],  // 截取第1秒的帧（避免纯黑首帧）
        filename: `cover_${projectId}.jpg`,
        folder: tempDir,
        size: '1280x?',            // 宽度1280，高度自适应
      })
      .on('end', () => {
        if (existsSync(coverPath)) {
          resolve(coverPath)
        } else {
          reject(new Error('封面生成完成但文件不存在'))
        }
      })
      .on('error', (err) => {
        reject(new Error(`封面生成失败: ${err.message}`))
      })
  })
}