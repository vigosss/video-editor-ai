// ==========================================
// Whisper 语音识别服务（使用 whisper.cpp CLI）
// ==========================================

import { getWhisperModelsDir, getWhisperCliPath } from '../utils/paths'
import { existsSync, unlinkSync, createWriteStream, writeFileSync, statSync, renameSync, readFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import { https, http } from 'follow-redirects'
import { URL } from 'url'
import { spawn } from 'child_process'
import type { WhisperModelSize } from '../../shared/settings'

// ==========================================
// 类型定义
// ==========================================

/** 转录段落（带时间戳） */
export interface TranscribeSegment {
  id: number
  startTime: number  // 秒
  endTime: number    // 秒
  text: string
}

/** 转录结果 */
export interface TranscribeResult {
  segments: TranscribeSegment[]
  fullText: string
  srtPath: string
}

/** 模型信息 */
export interface ModelInfo {
  size: WhisperModelSize
  downloaded: boolean
  path: string
  fileSize: number  // 字节
}

/** 进度回调类型 */
export type ProgressCallback = (progress: number, message: string) => void

// ==========================================
// 常量
// ==========================================

/** 模型文件名映射 */
const MODEL_FILENAMES: Record<WhisperModelSize, string> = {
  tiny: 'ggml-tiny.bin',
  base: 'ggml-base.bin',
  small: 'ggml-small.bin',
}

/**
 * 多源下载配置（按优先级排列）
 * 支持国内镜像自动降级
 */
const MODEL_SOURCES: Record<WhisperModelSize, string[]> = {
  tiny: [
    'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    'https://modelscope.cn/api/v1/models/pkufool/whisper.cpp/repo?Revision=master&FilePath=ggml-tiny.bin',
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  ],
  base: [
    'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  ],
  small: [
    'https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  ],
}

// ==========================================
// 模型路径管理
// ==========================================

/** 获取模型文件路径 */
export function getModelPath(size: WhisperModelSize): string {
  return join(getWhisperModelsDir(), MODEL_FILENAMES[size])
}

/** 检测模型是否已下载 */
export function isModelDownloaded(size: WhisperModelSize): boolean {
  const modelPath = getModelPath(size)
  if (!existsSync(modelPath)) return false
  try {
    const stats = statSync(modelPath)
    return stats.size > 1024 * 1024
  } catch {
    return false
  }
}

/** 获取所有可用模型信息 */
export function getAvailableModels(): ModelInfo[] {
  const sizes: WhisperModelSize[] = ['tiny', 'base', 'small']
  return sizes.map((size) => {
    const path = getModelPath(size)
    let fileSize = 0
    try {
      if (existsSync(path)) {
        fileSize = statSync(path).size
      }
    } catch {
      // 忽略
    }
    return {
      size,
      downloaded: isModelDownloaded(size),
      path,
      fileSize,
    }
  })
}

// ==========================================
// 模型下载（多源自动降级）
// ==========================================

function downloadWithProgress(
  url: string,
  destPath: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const httpModule = parsedUrl.protocol === 'https:' ? https : http
    const tempPath = destPath + '.downloading'

    try {
      if (existsSync(tempPath)) unlinkSync(tempPath)
    } catch { /* 忽略 */ }

    const file = createWriteStream(tempPath)
    let downloadedBytes = 0
    let totalBytes = 0

    const request = httpModule.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close()
        try { unlinkSync(tempPath) } catch { /* 忽略 */ }
        downloadWithProgress(response.headers.location, destPath, onProgress)
          .then(resolve)
          .catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        file.close()
        try { unlinkSync(tempPath) } catch { /* 忽略 */ }
        reject(new Error(`下载失败，HTTP 状态码: ${response.statusCode}`))
        return
      }

      totalBytes = parseInt(response.headers['content-length'] || '0', 10)

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        if (totalBytes > 0 && onProgress) {
          const progress = Math.round((downloadedBytes / totalBytes) * 100)
          onProgress(progress)
        }
      })

      response.pipe(file)

      file.on('finish', () => {
        file.close(() => {
          try {
            if (existsSync(destPath)) unlinkSync(destPath)
            renameSync(tempPath, destPath)
            resolve()
          } catch (err) {
            reject(new Error(`重命名临时文件失败: ${(err as Error).message}`))
          }
        })
      })
    })

    request.on('error', (err) => {
      file.close()
      try { unlinkSync(tempPath) } catch { /* 忽略 */ }
      reject(new Error(`网络请求失败: ${err.message}`))
    })

    request.setTimeout(5 * 60 * 1000, () => {
      request.destroy()
      file.close()
      try { unlinkSync(tempPath) } catch { /* 忽略 */ }
      reject(new Error('下载超时'))
    })
  })
}

/** 下载模型（多源自动降级） */
export async function downloadModel(
  size: WhisperModelSize,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (isModelDownloaded(size)) {
    onProgress?.(100, '模型已存在，无需下载')
    return
  }

  const urls = MODEL_SOURCES[size]
  let lastError: Error | null = null

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const hostname = new URL(url).hostname

    try {
      onProgress?.(0, `正在从 ${hostname} 下载 ${size} 模型...`)
      console.log(`[Whisper] 尝试从 ${hostname} 下载 ${size} 模型 (${i + 1}/${urls.length})`)

      await downloadWithProgress(url, getModelPath(size), (progress) => {
        onProgress?.(progress, `正在下载 ${size} 模型 (${progress}%)`)
      })

      if (!isModelDownloaded(size)) {
        throw new Error('下载完成但模型文件校验失败')
      }

      console.log(`[Whisper] ${size} 模型下载成功`)
      onProgress?.(100, `${size} 模型下载完成`)
      return
    } catch (err) {
      console.warn(`[Whisper] 源 ${hostname} 失败: ${(err as Error).message}`)
      lastError = err as Error
      try {
        const modelPath = getModelPath(size)
        if (existsSync(modelPath)) unlinkSync(modelPath)
        const tempPath = modelPath + '.downloading'
        if (existsSync(tempPath)) unlinkSync(tempPath)
      } catch { /* 忽略 */ }
    }
  }

  const modelPath = getModelPath(size)
  throw new Error(
    `所有下载源均失败。您可以手动下载 ${size} 模型文件并放置到：${modelPath}\n` +
    `下载地址：https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/${MODEL_FILENAMES[size]}\n` +
    `最后错误：${lastError?.message}`,
  )
}

/** 删除模型文件 */
export function deleteModel(size: WhisperModelSize): void {
  const modelPath = getModelPath(size)
  if (existsSync(modelPath)) {
    unlinkSync(modelPath)
    console.log(`[Whisper] 已删除 ${size} 模型`)
  }
}

// ==========================================
// 音频转录（通过 whisper.cpp CLI）
// ==========================================

/**
 * 转录音频文件，生成带时间戳的段落和 SRT 字幕文件
 * @param audioPath 音频文件路径（WAV 16kHz 单声道）
 * @param modelSize 模型大小
 * @param outputPath SRT 输出路径（也用于定位输出目录）
 * @param onProgress 进度回调
 * @returns 转录结果
 */
export async function transcribeAudio(
  audioPath: string,
  modelSize: WhisperModelSize,
  outputPath: string,
  onProgress?: ProgressCallback,
): Promise<TranscribeResult> {
  // 校验音频文件
  if (!existsSync(audioPath)) {
    throw new Error(`音频文件不存在: ${audioPath}`)
  }

  // 校验模型文件
  if (!isModelDownloaded(modelSize)) {
    throw new Error(`${modelSize} 模型未下载，请先下载模型`)
  }

  const modelPath = getModelPath(modelSize)
  const cliPath = getWhisperCliPath()
  const outputDir = dirname(outputPath)
  const outputBaseName = basename(outputPath, '.srt')

  console.log(`[Whisper] 开始转录: ${audioPath}`)
  console.log(`[Whisper] 使用模型: ${modelSize} (${modelPath})`)
  console.log(`[Whisper] CLI 路径: ${cliPath}`)

  onProgress?.(0, '正在启动 Whisper CLI...')

  // 构建 CLI 参数
  const args = [
    '-m', modelPath,
    '-f', audioPath,
    '-l', 'zh',
    '-t', '4',
    '--output-srt',
    '--split-on-word',
    '--print-progress',
    '-of', join(outputDir, outputBaseName),
  ]

  return new Promise<TranscribeResult>((resolve, reject) => {
    const proc = spawn(cliPath, args, {
      cwd: outputDir,
      env: { ...process.env },
    })

    let stderr = ''

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      stderr += text

      // 解析进度：匹配 "progress = XX%"
      const progressMatches = text.matchAll(/progress\s*=\s*(\d+)%/g)
      for (const match of progressMatches) {
        const pct = parseInt(match[1])
        // Whisper 进度 0-100，映射到我们的 10-90 范围
        const mapped = 10 + Math.round(pct * 0.8)
        onProgress?.(mapped, `正在转录 (${pct}%)...`)
      }
    })

    proc.stdout.on('data', () => {
      // 忽略 stdout
    })

    proc.on('error', (err) => {
      console.error(`[Whisper] CLI 启动失败: ${err.message}`)
      reject(new Error(`Whisper CLI 启动失败: ${err.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Whisper] CLI 退出码: ${code}`)
        console.error(`[Whisper] stderr: ${stderr}`)
        reject(new Error(`Whisper CLI 执行失败 (退出码: ${code}): ${stderr.slice(-500)}`))
        return
      }

      onProgress?.(90, '正在解析 SRT 字幕...')

      // 读取 CLI 生成的 SRT 文件
      const generatedSrtPath = join(outputDir, `${outputBaseName}.srt`)
      if (!existsSync(generatedSrtPath)) {
        reject(new Error(`Whisper CLI 未生成 SRT 文件: ${generatedSrtPath}`))
        return
      }

      const srtContent = readFileSync(generatedSrtPath, 'utf-8')
      const segments = parseSrtContent(srtContent)
      const fullText = segments.map((s) => s.text).join(' ').trim()

      onProgress?.(100, '转录完成')

      console.log(`[Whisper] 转录完成，共 ${segments.length} 个段落`)
      console.log(`[Whisper] SRT 文件已保存: ${generatedSrtPath}`)

      resolve({
        segments,
        fullText,
        srtPath: generatedSrtPath,
      })
    })
  })
}

// ==========================================
// SRT 字幕解析
// ==========================================

/**
 * 解析 SRT 格式字幕内容为 TranscribeSegment 数组
 */
function parseSrtContent(srtContent: string): TranscribeSegment[] {
  const segments: TranscribeSegment[] = []

  // SRT 格式：
  // 1
  // 00:00:01,000 --> 00:00:05,000
  // 字幕文本
  const blocks = srtContent.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // 第一行是序号
    const id = parseInt(lines[0].trim())
    if (isNaN(id)) continue

    // 第二行是时间戳
    const timeLine = lines[1].trim()
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/,
    )
    if (!timeMatch) continue

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000

    // 剩余行是字幕文本
    const text = lines.slice(2).join(' ').trim()
    if (!text) continue

    segments.push({ id, startTime, endTime, text })
  }

  return segments
}
