// ==========================================
// FFmpeg 服务 — 视频处理核心
// ==========================================

import ffmpeg from 'fluent-ffmpeg'
import { getFfmpegPath, getFfprobePath, getProjectDir, getTempDir } from '../utils/paths'
import { exec, spawn } from 'child_process'
import { existsSync, unlinkSync, readdirSync, mkdirSync, writeFileSync, copyFileSync } from 'fs'
import { join, basename, extname } from 'path'
import type { VideoInfo } from '../../shared/video'
import type { AudioMixOptions } from '../../shared/bgm'

// ==========================================
// FFmpeg 初始化
// ==========================================

/** 设置 fluent-ffmpeg 的二进制路径 */
function initFfmpeg(): void {
  const ffmpegPath = getFfmpegPath()
  const ffprobePath = getFfprobePath()
  ffmpeg.setFfmpegPath(ffmpegPath)
  ffmpeg.setFfprobePath(ffprobePath)
}

// 模块加载时初始化路径
initFfmpeg()

// ==========================================
// 工具函数
// ==========================================

/** Promise 包装的 ffprobe */
function probeVideo(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) reject(new Error(`视频探测失败: ${err.message}`))
      else resolve(data)
    })
  })
}

/** Promise 包装的 ffmpeg 命令执行 */
function runCommand(cmd: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd.on('error', (err) => {
      reject(new Error(`FFmpeg 处理失败: ${err.message}`))
    }).on('end', () => {
      resolve()
    }).run()
  })
}

/**
 * 直接使用 child_process.spawn 执行 FFmpeg
 *
 * 为什么不用 fluent-ffmpeg：
 *   fluent-ffmpeg 的 complexFilter(string) 内部会将字符串重新序列化，
 *   可能改变分号、括号等字符的处理方式，导致 filter_complex 语义改变。
 *   spawn 直接将参数数组传给操作系统，完全不经过 shell 解析或库处理。
 */
function spawnFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegBin = getFfmpegPath()

    const proc = spawn(ffmpegBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        // 从 stderr 中提取最相关的错误行
        const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean)
        const errorLines = lines.filter((l) =>
          /error|invalid|no such|failed|unable/i.test(l),
        )
        const relevant = errorLines.length > 0 ? errorLines : lines
        const errMsg = relevant.slice(-8).join(' | ')
        reject(new Error(`ffmpeg exited with code ${code}: ${errMsg}`))
      }
    })

    proc.on('error', (err: NodeJS.ErrnoException) => {
      reject(new Error(`FFmpeg 启动失败: ${err.message}`))
    })
  })
}

/** 删除文件（静默忽略不存在的情况） */
function safeUnlink(filePath: string): void {
  try {
    if (existsSync(filePath)) unlinkSync(filePath)
  } catch {
    // 静默忽略
  }
}

// ==========================================
// FFmpeg 可用性检测
// ==========================================

/** 检测 FFmpeg 是否可用 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegBin = getFfmpegPath()
    exec(`"${ffmpegBin}" -version`, (err) => {
      resolve(!err)
    })
  })
}

/** 检测 FFmpeg 是否支持 xfade 滤镜（转场效果必需） */
export async function checkXfadeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegBin = getFfmpegPath()
    exec(`"${ffmpegBin}" -filters`, (err, stdout) => {
      if (err) {
        resolve(false)
        return
      }
      resolve(/\bxfade\b/.test(stdout))
    })
  })
}

// ==========================================
// 视频解析
// ==========================================

/** 获取视频信息（时长、分辨率、帧率、编码等） */
export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  if (!existsSync(filePath)) {
    throw new Error(`视频文件不存在: ${filePath}`)
  }

  const data = await probeVideo(filePath)

  // 查找视频流
  const videoStream = data.streams.find((s) => s.codec_type === 'video')
  if (!videoStream) {
    throw new Error('未找到视频流')
  }

  // 查找音频流（可选）
  const audioStream = data.streams.find((s) => s.codec_type === 'audio')

  // 计算时长
  const duration = data.format.duration ?? 0

  // 计算帧率
  let fps = 30 // 默认值
  if (videoStream.r_frame_rate) {
    const parts = videoStream.r_frame_rate.split('/')
    if (parts.length === 2 && parseInt(parts[1]) > 0) {
      fps = parseInt(parts[0]) / parseInt(parts[1])
    }
  } else if (videoStream.avg_frame_rate) {
    const parts = videoStream.avg_frame_rate.split('/')
    if (parts.length === 2 && parseInt(parts[1]) > 0) {
      fps = parseInt(parts[0]) / parseInt(parts[1])
    }
  }

  // 比特率
  const bitrate = Number(data.format.bit_rate || 0) ||
    Number(videoStream.bit_rate || 0) ||
    Number(audioStream?.bit_rate || 0)

  return {
    duration: Math.round(duration * 100) / 100,
    width: videoStream.width ?? 0,
    height: videoStream.height ?? 0,
    fps: Math.round(fps * 100) / 100,
    bitrate,
    codec: videoStream.codec_name ?? 'unknown',
    size: data.format.size ?? 0,
  }
}

// ==========================================
// 音频提取
// ==========================================

/**
 * 从视频中提取音频，转为 16kHz 单声道 WAV
 * @param videoPath 视频文件路径
 * @param outputDir 输出目录（可选，默认为临时目录）
 * @returns 输出的 WAV 文件路径
 */
export async function extractAudio(videoPath: string, outputDir?: string): Promise<string> {
  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }

  const dir = outputDir ?? getTempDir()
  const videoName = basename(videoPath, extname(videoPath))
  const outputPath = join(dir, `${videoName}_audio.wav`)

  // 如果已存在则先删除
  safeUnlink(outputPath)

  const cmd = ffmpeg(videoPath)
    .noVideo()
    .audioCodec('pcm_s16le')    // 16-bit PCM
    .audioFrequency(16000)       // 16kHz
    .audioChannels(1)            // 单声道
    .outputOptions([
      '-map', '0:a:0',          // 只取第一个音频流
      '-c:s', 'copy',           // 字幕流直接拷贝，不需要解码器
      '-c:d', 'copy',           // 数据流直接拷贝，不需要解码器
    ])
    .format('wav')
    .output(outputPath)

  await runCommand(cmd)

  if (!existsSync(outputPath)) {
    throw new Error('音频提取完成但输出文件不存在')
  }

  return outputPath
}

// ==========================================
// 关键帧抽取
// ==========================================

/**
 * 按时间间隔从视频中抽取关键帧
 * @param videoPath 视频文件路径
 * @param outputDir 输出目录
 * @param interval 抽帧间隔（秒），默认 2 秒
 * @returns 抽取的帧图片路径数组（按时间排序）
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string,
  interval: number = 2,
): Promise<string[]> {
  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }

  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // 先清理输出目录中已有的帧图片
  const existingFiles = readdirSync(outputDir).filter((f) => f.endsWith('.jpg'))
  for (const f of existingFiles) {
    safeUnlink(join(outputDir, f))
  }

  const outputPattern = join(outputDir, 'frame_%04d.jpg')

  const cmd = ffmpeg(videoPath)
    .outputOptions([
      '-vf', `fps=1/${interval},scale=1280:-2`,  // 每 N 秒一帧，宽度 1280，高度自动
      '-q:v 2',                                    // JPEG 质量（2 = 高质量）
      '-map', '0:v:0',                             // 只取第一个视频流
      '-c:s', 'copy',                              // 字幕流直接拷贝，不需要解码器
      '-c:d', 'copy',                              // 数据流直接拷贝，不需要解码器
    ])
    .output(outputPattern)

  await runCommand(cmd)

  // 收集输出的帧文件路径
  const frames = readdirSync(outputDir)
    .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
    .sort()
    .map((f) => join(outputDir, f))

  if (frames.length === 0) {
    throw new Error('关键帧抽取完成但没有生成任何帧图片')
  }

  return frames
}

// ==========================================
// 视频剪辑
// ==========================================

/** 剪辑片段参数 */
export interface ClipParams {
  startTime: number  // 开始时间（秒）
  endTime: number    // 结束时间（秒）
  reason?: string    // 剪辑理由（可选）
}

/**
 * 根据时间段列表剪辑视频
 * 每个时间段生成一个独立的视频片段文件
 * @param videoPath 原视频路径
 * @param clips 剪辑时间段列表
 * @param outputDir 输出目录
 * @returns 剪辑后的视频片段路径数组（按 startTime 排序）
 */
export async function clipVideo(
  videoPath: string,
  clips: ClipParams[],
  outputDir: string,
): Promise<string[]> {
  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }
  if (clips.length === 0) {
    throw new Error('剪辑片段列表不能为空')
  }

  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // 保持 AI 返回的原始顺序（不做排序），clips 数组的顺序 = 最终视频播放顺序
  const sortedClips = [...clips]

  // 检测视频是否有音频流（用于 stream mapping）
  const probeData = await probeVideo(videoPath)
  const hasAudio = probeData.streams.some(s => s.codec_type === 'audio')

  const outputPaths: string[] = []

  // 逐个剪辑，避免并发导致的资源竞争
  for (let i = 0; i < sortedClips.length; i++) {
    const clip = sortedClips[i]
    const duration = clip.endTime - clip.startTime
    if (duration <= 0) {
      throw new Error(`剪辑片段 ${i + 1} 的时间无效: startTime=${clip.startTime}, endTime=${clip.endTime}`)
    }

    const outputPath = join(outputDir, `clip_${String(i + 1).padStart(3, '0')}.mp4`)

    // 如果已存在则先删除
    safeUnlink(outputPath)

    const clipOpts: string[] = [
      '-preset fast',       // 编码速度预设
      '-crf 23',            // 质量因子（18-28，越小质量越高）
      '-threads 4',         // 限制线程数，降低内存占用
      '-x264-params ref=2', // 减少参考帧，降低内存占用
      '-avoid_negative_ts make_zero',
      '-map', '0:v:0',     // 只取第一个视频流
      '-c:s', 'copy',      // 字幕流直接拷贝，不需要解码器
      '-c:d', 'copy',      // 数据流直接拷贝，不需要解码器
    ]

    if (hasAudio) {
      clipOpts.push('-map', '0:a:0')  // 只取第一个音频流
    }

    const cmd = ffmpeg(videoPath)
      .setStartTime(clip.startTime)
      .setDuration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(clipOpts)
      .output(outputPath)

    await runCommand(cmd)

    if (!existsSync(outputPath)) {
      throw new Error(`剪辑片段 ${i + 1} 处理完成但输出文件不存在`)
    }

    outputPaths.push(outputPath)
  }

  return outputPaths
}

// ==========================================
// 视频片段合并
// ==========================================

/**
 * 将多个视频片段合并为一个视频
 * @param clipPaths 视频片段路径数组
 * @param outputPath 输出文件路径
 * @returns 合并后的视频路径
 */
export async function mergeClips(clipPaths: string[], outputPath: string): Promise<string> {
  if (clipPaths.length === 0) {
    throw new Error('视频片段列表不能为空')
  }

  // 校验所有片段文件存在
  for (const p of clipPaths) {
    if (!existsSync(p)) {
      throw new Error(`视频片段不存在: ${p}`)
    }
  }

  // 如果只有一个片段，直接复制
  if (clipPaths.length === 1) {
    safeUnlink(outputPath)
    copyFileSync(clipPaths[0], outputPath)
    return outputPath
  }

  // 如果已存在输出文件则先删除
  safeUnlink(outputPath)

  // 使用 concat demuxer 合并（无需重新编码，速度快）
  const tempDir = getTempDir()
  const concatListPath = join(tempDir, `concat_${Date.now()}.txt`)

  // 生成 concat 文件列表
  const concatContent = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')

  writeFileSync(concatListPath, concatContent, 'utf-8')

  try {
    // 检测第一个片段是否有音频流
    const firstClipProbe = await probeVideo(clipPaths[0])
    const hasAudio = firstClipProbe.streams.some(s => s.codec_type === 'audio')

    const concatOpts: string[] = [
      '-c', 'copy',          // 直接拷贝流，不重新编码
      '-map', '0:v:0',      // 只拷贝第一个视频流
      '-c:s', 'copy',       // 字幕流直接拷贝，不需要解码器
      '-c:d', 'copy',       // 数据流直接拷贝，不需要解码器
    ]

    if (hasAudio) {
      concatOpts.push('-map', '0:a:0')
    }

    const cmd = ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(concatOpts)
      .output(outputPath)

    await runCommand(cmd)
  } finally {
    // 清理临时 concat 文件
    safeUnlink(concatListPath)
  }

  if (!existsSync(outputPath)) {
    throw new Error('视频合并完成但输出文件不存在')
  }

  return outputPath
}

// ==========================================
// 字幕嵌入
// ==========================================

/**
 * 将 SRT 字幕文件嵌入视频（硬字幕 - 烧录到画面上）
 * @param videoPath 视频文件路径
 * @param srtPath SRT 字幕文件路径
 * @param outputPath 输出文件路径
 * @returns 嵌入字幕后的视频路径
 */
export async function embedSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string,
): Promise<string> {
  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }
  if (!existsSync(srtPath)) {
    throw new Error(`字幕文件不存在: ${srtPath}`)
  }

  // 如果已存在输出文件则先删除
  safeUnlink(outputPath)

  // 使用 subtitles filter 烧录字幕
  // 注意：路径中的特殊字符需要转义
  const escapedSrtPath = srtPath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\\\'")

  const cmd = ffmpeg(videoPath)
    .videoFilters([
      `subtitles='${escapedSrtPath}'`,
    ])
    .audioCodec('copy')     // 音频直接拷贝
    .videoCodec('libx264')
    .outputOptions([
      '-preset fast',
      '-crf 23',
      '-threads 4',         // 限制线程数，降低内存占用
      '-x264-params ref=2', // 减少参考帧，降低内存占用
      '-map', '0:v:0',     // 只取第一个视频流
      '-map', '0:a:0',     // 只取第一个音频流
      '-c:s', 'copy',      // 字幕流直接拷贝，不需要解码器
      '-c:d', 'copy',      // 数据流直接拷贝，不需要解码器
    ])
    .output(outputPath)

  await runCommand(cmd)

  if (!existsSync(outputPath)) {
    throw new Error('字幕嵌入完成但输出文件不存在')
  }

  return outputPath
}

// ==========================================
// 便捷方法：获取项目工作目录
// ==========================================

/** 获取项目的工作目录（存放中间产物） */
export function getProjectWorkDir(projectId: string): string {
  const dir = join(getProjectDir(projectId), 'work')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

// ==========================================
// 多视频标准化与合并
// ==========================================

/**
 * 将单个视频标准化为统一格式（用于拼接前的预处理）
 * @param inputPath 输入视频路径
 * @param outputPath 输出视频路径
 * @param targetWidth 目标宽度（默认 1920）
 * @param targetHeight 目标高度（默认 1080）
 * @param targetFps 目标帧率（默认 30）
 */
export async function normalizeVideo(
  inputPath: string,
  outputPath: string,
  targetWidth: number = 1920,
  targetHeight: number = 1080,
  targetFps: number = 30,
): Promise<string> {
  if (!existsSync(inputPath)) {
    throw new Error(`视频文件不存在: ${inputPath}`)
  }

  safeUnlink(outputPath)

  // 检测输入是否有音频流
  const probeData = await probeVideo(inputPath)
  const hasAudio = probeData.streams.some(s => s.codec_type === 'audio')

  // scale + pad：等比缩放后用黑边填充到精确目标尺寸
  const vf = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`

  const outputOpts: string[] = [
    '-preset fast',
    '-crf 23',
    '-threads 4',            // 限制线程数，降低内存占用
    '-x264-params ref=2',    // 减少参考帧，降低内存占用
    '-r', String(targetFps),
    '-vf', vf,
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-map', '0:v:0',         // 只取第一个视频流
    '-c:s', 'copy',          // 字幕流直接拷贝，不需要解码器
    '-c:d', 'copy',          // 数据流直接拷贝，不需要解码器
  ]

  if (hasAudio) {
    outputOpts.push('-map', '0:a:0')  // 只取第一个音频流
  }

  const cmd = ffmpeg(inputPath)
    .videoCodec('libx264')
    .outputOptions(outputOpts)

  if (hasAudio) {
    cmd.audioCodec('aac').audioFrequency(44100).audioChannels(2)
  } else {
    cmd.noAudio()
  }

  cmd.output(outputPath)
  await runCommand(cmd)

  if (!existsSync(outputPath)) {
    throw new Error('视频标准化完成但输出文件不存在')
  }

  return outputPath
}

/**
 * 标准化多个视频并拼接为一个视频
 * 两遍处理：第一遍逐个标准化，第二遍用 concat demuxer 拼接（流拷贝，快速）
 * @param videoPaths 视频文件路径数组
 * @param normalizedDir 标准化中间文件存放目录
 * @param outputPath 最终拼接输出路径
 */
export async function normalizeAndConcat(
  videoPaths: string[],
  normalizedDir: string,
  outputPath: string,
): Promise<string> {
  if (videoPaths.length === 0) {
    throw new Error('视频列表不能为空')
  }

  if (!existsSync(normalizedDir)) {
    mkdirSync(normalizedDir, { recursive: true })
  }

  // 第一遍：逐个标准化为统一格式
  const normalizedPaths: string[] = []
  for (let i = 0; i < videoPaths.length; i++) {
    const normalizedPath = join(normalizedDir, `normalized_${String(i + 1).padStart(3, '0')}.mp4`)
    await normalizeVideo(videoPaths[i], normalizedPath)
    normalizedPaths.push(normalizedPath)
  }

  // 只有一个视频时直接复制
  if (normalizedPaths.length === 1) {
    safeUnlink(outputPath)
    copyFileSync(normalizedPaths[0], outputPath)
    return outputPath
  }

  // 第二遍：用 concat demuxer 拼接（已标准化，流拷贝无需重编码）
  safeUnlink(outputPath)

  const tempDir = getTempDir()
  const concatListPath = join(tempDir, `concat_${Date.now()}.txt`)
  const concatContent = normalizedPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')

  writeFileSync(concatListPath, concatContent, 'utf-8')

  try {
    const cmd = ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c', 'copy',
        '-map', '0:v:0',      // 只拷贝第一个视频流
        '-map', '0:a:0',      // 只拷贝第一个音频流（标准化后的视频一定有音频）
        '-c:s', 'copy',       // 字幕流直接拷贝，不需要解码器
        '-c:d', 'copy',       // 数据流直接拷贝，不需要解码器
      ])
      .output(outputPath)

    await runCommand(cmd)
  } finally {
    safeUnlink(concatListPath)
  }

  if (!existsSync(outputPath)) {
    throw new Error('视频合并完成但输出文件不存在')
  }

  return outputPath
}

// ==========================================
// 音频解码（用于节拍检测）
// ==========================================

/**
 * 将音频文件解码为 WAV 格式
 * @param inputPath 输入音频文件路径（MP3/AAC 等）
 * @param outputPath 输出 WAV 文件路径
 * @param sampleRate 采样率（默认 44100Hz）
 */
export async function decodeAudioToWav(
  inputPath: string,
  outputPath: string,
  sampleRate: number = 44100,
): Promise<string> {
  if (!existsSync(inputPath)) {
    throw new Error(`音频文件不存在: ${inputPath}`)
  }

  safeUnlink(outputPath)

  const cmd = ffmpeg(inputPath)
    .audioCodec('pcm_s16le')
    .audioFrequency(sampleRate)
    .audioChannels(2)
    .format('wav')
    .output(outputPath)

  await runCommand(cmd)

  if (!existsSync(outputPath)) {
    throw new Error('音频解码完成但输出文件不存在')
  }

  return outputPath
}

// ==========================================
// 带转场的视频合并
// ==========================================

// 转场目标规格常量
const XFADE_TARGET_FPS = 30
const XFADE_TARGET_AUDIO_RATE = 44100

/**
 * 构建带转场的 filter_complex 字符串
 *
 * 视频部分：scale（统一分辨率）→ fps（统一帧率）→ format（统一像素格式）→ setpts（重置 PTS）→ xfade 链
 * 音频部分：aresample（统一采样率）→ asetpts（重置 PTS）→ afade（渐入渐出）→ adelay（定位到时间线）→ amix（混合）
 *
 * 音频为什么不用 acrossfade 链式调用：
 *   acrossfade 需要在初始化时确定第一路输入流的总时长（用于计算淡化起点）。
 *   当第一路输入是另一个 acrossfade 的输出（filter 输出流）时，FFmpeg 在 graph
 *   初始化阶段无法确定其时长，会在 query_formats / config_props 阶段返回 EINVAL。
 *
 * 音频新方案：adelay + afade + amix
 *   1. 对每个片段单独做渐入 / 渐出
 *   2. 用 adelay 将每个片段定位到输出时间线上的正确位置
 *   3. 用 amix normalize=0 直接叠加（不做音量归一化）
 *   交叉淡化窗口内：片段 i 渐出 (1→0) + 片段 i+1 渐入 (0→1) = 总音量恒为 1
 */
function buildTransitionFilterComplex(params: {
  clipCount: number
  durations: number[]
  transitionType: string
  transitionDuration: number
  allHaveAudio: boolean
  targetW: number
  targetH: number
}): string {
  const {
    clipCount, durations, transitionType, transitionDuration,
    allHaveAudio, targetW, targetH,
  } = params

  const filters: string[] = []

  // ── 步骤 1：每路输入视频标准化 ─────────────────────────────
  // force_original_aspect_ratio=decrease + pad：等比缩放后黑边填充，保证精确尺寸
  // 确保 targetW / targetH 为偶数（yuv420p 要求）
  const w = Math.ceil(targetW / 2) * 2
  const h = Math.ceil(targetH / 2) * 2

  for (let i = 0; i < clipCount; i++) {
    filters.push(
      `[${i}:v]` +
      `scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,` +
      `fps=${XFADE_TARGET_FPS},` +
      `format=yuv420p,` +
      `setpts=PTS-STARTPTS` +
      `[nv${i}]`,
    )
  }

  // ── 步骤 2：每路输入音频标准化 ─────────────────────────────
  // 仅做采样率重采样 + PTS 重置，不强制声道数（避免单声道源转换失败）
  if (allHaveAudio) {
    for (let i = 0; i < clipCount; i++) {
      filters.push(
        `[${i}:a]` +
        `aresample=${XFADE_TARGET_AUDIO_RATE},` +
        `asetpts=PTS-STARTPTS` +
        `[na${i}]`,
      )
    }
  }

  // ── 步骤 3：视频 xfade 链 ───────────────────────────────────
  // offset = 当前累积时长 - transitionDuration
  //   即：在当前输出流结束前 transitionDuration 秒开始混合下一片段
  let accumulatedDuration = durations[0]

  for (let i = 0; i < clipCount - 1; i++) {
    const isLast = i === clipCount - 2
    const vIn1 = i === 0 ? '[nv0]' : `[vt${i - 1}]`
    const vIn2 = `[nv${i + 1}]`
    const vOut = isLast ? '[vout]' : `[vt${i}]`
    const offset = Math.max(0, accumulatedDuration - transitionDuration)

    filters.push(
      `${vIn1}${vIn2}` +
      `xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}` +
      `${vOut}`,
    )

    accumulatedDuration += durations[i + 1] - transitionDuration
  }

  // ── 步骤 4：音频混合（adelay + afade + amix）──────────────
  //
  // 计算每个片段在输出时间线上的起始时间（毫秒，adelay 需要整数毫秒）
  // startMs[0] = 0
  // startMs[i] = startMs[i-1] + (durations[i-1] - transitionDuration) * 1000
  if (allHaveAudio) {
    const startMs: number[] = []
    let cur = 0
    for (let i = 0; i < clipCount; i++) {
      startMs.push(Math.round(cur))
      cur += (durations[i] - transitionDuration) * 1000
    }

    for (let i = 0; i < clipCount; i++) {
      const perClipFilters: string[] = []

      // 渐入：第 2 片段起，在本片段开头淡入（相对于本片段 t=0）
      if (i > 0) {
        perClipFilters.push(`afade=t=in:st=0:d=${transitionDuration}`)
      }

      // 渐出：末尾片段除外，在本片段结尾淡出
      if (i < clipCount - 1) {
        const fadeOutSt = Math.max(0, durations[i] - transitionDuration)
        perClipFilters.push(`afade=t=out:st=${fadeOutSt.toFixed(3)}:d=${transitionDuration}`)
      }

      // adelay：将片段音频延迟到输出时间线上的正确位置
      // 使用单值形式，FFmpeg 会自动应用到所有声道（兼容单声道和立体声）
      perClipFilters.push(`adelay=${startMs[i]}`)

      const filterChain = perClipFilters.length > 0
        ? perClipFilters.join(',')
        : 'anull'

      filters.push(`[na${i}]${filterChain}[da${i}]`)
    }

    // amix：叠加所有延迟后的音频
    //   normalize=0：直接求和，不做音量归一化
    //   （crossfade 窗口内：渐出 + 渐入 = 1.0，normalize=0 才能保证音量正确）
    //   dropout_transition=0：片段结束时不额外淡出
    const mixInputs = Array.from({ length: clipCount }, (_, i) => `[da${i}]`).join('')
    filters.push(
      `${mixInputs}amix=inputs=${clipCount}:duration=longest:dropout_transition=0:normalize=0[aout]`,
    )
  }

  return filters.join(';')
}

/**
 * 使用 spawnFFmpeg 执行转场合并命令
 * 将 filter_complex 写入临时文件后通过 -filter_complex_script 传入，
 * 彻底避免命令行长度限制和字符转义问题
 */
async function runTransitionMerge(params: {
  clipPaths: string[]
  outputPath: string
  complexFilter: string
  allHaveAudio: boolean
}): Promise<void> {
  const { clipPaths, outputPath, complexFilter, allHaveAudio } = params

  const tempDir = getTempDir()
  // 将 filter_complex 写入文件，用 -filter_complex_script 读取
  // 优势：彻底绕过命令行长度限制（Windows MAX_PATH、shell 参数长度等）
  const filterScriptPath = join(tempDir, `fc_${Date.now()}.txt`)
  writeFileSync(filterScriptPath, complexFilter, 'utf-8')

  try {
    const args: string[] = ['-y']

    for (const p of clipPaths) {
      args.push('-i', p)
    }

    // 通过文件传入 filter_complex，而非命令行参数
    args.push('-filter_complex_script', filterScriptPath)

    args.push('-map', '[vout]')
    args.push('-c:v', 'libx264')
    args.push('-preset', 'fast')
    args.push('-crf', '23')
    args.push('-pix_fmt', 'yuv420p')
    args.push('-r', String(XFADE_TARGET_FPS))
    args.push('-movflags', '+faststart')

    if (allHaveAudio) {
      args.push('-map', '[aout]')
      args.push('-c:a', 'aac')
      args.push('-ar', String(XFADE_TARGET_AUDIO_RATE))
      args.push('-ac', '2')
    }

    args.push(outputPath)

    console.log('[FFmpeg] 执行命令:', args.join(' '))

    await spawnFFmpeg(args)
  } finally {
    safeUnlink(filterScriptPath)
  }
}

/**
 * 合并两个片段（带转场效果）
 *
 * 内部函数，每次只处理 2 个输入，内存占用恒定。
 * 自带 3 级降级策略：
 *   1. 完整转场（视频 xfade + 音频淡化混合）
 *   2. 仅视频转场（xfade + 音频 concat）
 *   3. 直接 concat（无转场）
 */
async function mergeTwoClipsWithTransition(
  clipA: string,
  clipB: string,
  outputPath: string,
  transitionType: string,
  transitionDuration: number,
  targetW: number,
  targetH: number,
): Promise<{ path: string; degraded: boolean }> {
  const clipPaths = [clipA, clipB]

  // 探测两个片段的时长和音频信息
  const durations: number[] = []
  const hasAudioStreams: boolean[] = []

  for (let i = 0; i < clipPaths.length; i++) {
    const info = await getVideoInfo(clipPaths[i])
    durations.push(info.duration)
    const probe = await probeVideo(clipPaths[i])
    hasAudioStreams.push(probe.streams.some(s => s.codec_type === 'audio'))
  }

  const allHaveAudio = hasAudioStreams.every(Boolean)

  // 校验片段时长
  for (let i = 0; i < durations.length; i++) {
    if (durations[i] <= transitionDuration + 0.1) {
      throw new Error(
        `片段时长 (${durations[i].toFixed(2)}s) 不足，` +
        `需比转场时长 (${transitionDuration}s) 大至少 0.1s`,
      )
    }
  }

  const complexFilter = buildTransitionFilterComplex({
    clipCount: 2,
    durations,
    transitionType,
    transitionDuration,
    allHaveAudio,
    targetW,
    targetH,
  })

  // ── 方案一：完整转场 ──────────────────────────────────────
  try {
    await runTransitionMerge({ clipPaths, outputPath, complexFilter, allHaveAudio })
    return { path: outputPath, degraded: false }
  } catch (err) {
    console.warn(`[FFmpeg] 两两合并完整转场失败，尝试降级: ${(err as Error).message}`)
  }

  // ── 方案二：仅视频转场，音频 concat ──────────────────────
  try {
    safeUnlink(outputPath)
    const fallbackFilter = buildTransitionFilterComplex({
      clipCount: 2,
      durations,
      transitionType,
      transitionDuration,
      allHaveAudio: false,
      targetW,
      targetH,
    })

    let fullFallbackFilter = fallbackFilter
    if (allHaveAudio) {
      fullFallbackFilter += ';[0:a][1:a]concat=n=2:v=0:a=1[aout]'
    }

    await runTransitionMerge({
      clipPaths,
      outputPath,
      complexFilter: fullFallbackFilter,
      allHaveAudio,
    })
    return { path: outputPath, degraded: true }
  } catch (err2) {
    console.warn(`[FFmpeg] 仅视频转场也失败，降级为硬切: ${(err2 as Error).message}`)
  }

  // ── 方案三：直接 concat，无转场 ──────────────────────────
  safeUnlink(outputPath)
  const concatResult = await mergeClips(clipPaths, outputPath)
  return { path: concatResult, degraded: true }
}

/**
 * 将多个视频片段合并为一个视频（带转场效果）
 *
 * 采用分块合并策略：将 N 个片段拆分为 N-1 次两两合并，
 * 每次 FFmpeg 只处理 2 个输入，内存占用恒定。
 *
 * 单次两两合并内部的降级策略：
 *   1. 完整转场（视频 xfade + 音频淡化混合）
 *   2. 仅视频转场（xfade + 音频 concat）
 *   3. 直接 concat（无转场）
 */
export async function mergeClipsWithTransitions(
  clipPaths: string[],
  outputPath: string,
  transitionType: string,
  transitionDuration: number = 0.5,
): Promise<{ path: string; degraded: boolean }> {
  if (clipPaths.length === 0) {
    throw new Error('视频片段列表不能为空')
  }

  for (const p of clipPaths) {
    if (!existsSync(p)) {
      throw new Error(`视频片段不存在: ${p}`)
    }
  }

  if (clipPaths.length === 1) {
    safeUnlink(outputPath)
    copyFileSync(clipPaths[0], outputPath)
    return { path: outputPath, degraded: false }
  }

  // 2 个片段直接两两合并，无需分块
  if (clipPaths.length === 2) {
    safeUnlink(outputPath)
    const firstInfo = await getVideoInfo(clipPaths[0])
    const targetW = Math.ceil((firstInfo.width || 1920) / 2) * 2
    const targetH = Math.ceil((firstInfo.height || 1080) / 2) * 2
    return mergeTwoClipsWithTransition(
      clipPaths[0], clipPaths[1], outputPath,
      transitionType, transitionDuration, targetW, targetH,
    )
  }

  // ── 分块合并：逐对合并 N 个片段 ─────────────────────────
  safeUnlink(outputPath)

  // 从第一个片段获取目标分辨率（确保为偶数）
  const firstInfo = await getVideoInfo(clipPaths[0])
  const targetW = Math.ceil((firstInfo.width || 1920) / 2) * 2
  const targetH = Math.ceil((firstInfo.height || 1080) / 2) * 2

  // 临时文件目录（使用 outputPath 所在目录）
  const outputDir = join(outputPath, '..')
  const tempFiles: string[] = []
  let anyDegraded = false

  try {
    // 第 1 轮：clip_0 + clip_1 → chunk_000
    let currentPath: string

    console.log(`[FFmpeg] 分块合并开始: ${clipPaths.length} 个片段, 分 ${clipPaths.length - 1} 轮合并`)

    const chunk0 = join(outputDir, 'chunk_000.mp4')
    tempFiles.push(chunk0)

    const round1 = await mergeTwoClipsWithTransition(
      clipPaths[0], clipPaths[1], chunk0,
      transitionType, transitionDuration, targetW, targetH,
    )
    currentPath = round1.path
    if (round1.degraded) anyDegraded = true
    console.log(`[FFmpeg] 分块合并 1/${clipPaths.length - 1} 完成`)

    // 第 2 轮起：chunk_{i-1} + clip_{i+1} → chunk_i
    for (let i = 2; i < clipPaths.length; i++) {
      const chunkFile = join(outputDir, `chunk_${String(i - 1).padStart(3, '0')}.mp4`)
      tempFiles.push(chunkFile)

      const round = await mergeTwoClipsWithTransition(
        currentPath, clipPaths[i], chunkFile,
        transitionType, transitionDuration, targetW, targetH,
      )
      currentPath = round.path
      if (round.degraded) anyDegraded = true
      console.log(`[FFmpeg] 分块合并 ${i}/${clipPaths.length - 1} 完成`)
    }

    // 将最终结果复制/重命名为 outputPath
    safeUnlink(outputPath)
    copyFileSync(currentPath, outputPath)

    console.log(`[FFmpeg] 分块合并全部完成: ${clipPaths.length} 个片段`)

  } finally {
    // 清理所有中间 temp 文件
    for (const f of tempFiles) {
      safeUnlink(f)
    }
  }

  if (!existsSync(outputPath)) {
    throw new Error('转场合并完成但输出文件不存在')
  }

  return { path: outputPath, degraded: anyDegraded }
}

// ==========================================
// 音频混合（BGM + 原始音频）
// ==========================================

/**
 * 将视频与 BGM 混合
 * @param videoPath 视频文件路径
 * @param bgmPath BGM 文件路径
 * @param outputPath 输出文件路径
 * @param options 混音选项
 */
export async function mixAudioStreams(
  videoPath: string,
  bgmPath: string,
  outputPath: string,
  options: AudioMixOptions,
): Promise<string> {
  if (!existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`)
  }
  if (!existsSync(bgmPath)) {
    throw new Error(`BGM 文件不存在: ${bgmPath}`)
  }

  safeUnlink(outputPath)

  // 检查视频是否有音频流
  const probeData = await probeVideo(videoPath)
  const hasVideoAudio = probeData.streams.some(s => s.codec_type === 'audio')
  const videoDuration = probeData.format.duration ?? 0

  const cmd = ffmpeg()

  // BGM 输入
  cmd.input(bgmPath)

  // 如果需要循环，设置 inputOptions（必须在 input 之后）
  if (options.bgmLoop) {
    cmd.inputOptions(['-stream_loop', '-1'])
  }

  // 视频输入
  cmd.input(videoPath)

  if (options.mode === 'bgm_only' || !hasVideoAudio) {
    // 仅 BGM 模式（或视频无音频流时自动切换）
    const fadeInOpt = options.bgmFadeIn > 0 ? `afade=t=in:st=0:d=${options.bgmFadeIn}` : ''
    const fadeOutOpt = options.bgmFadeOut > 0 ? `afade=t=out:st=${Math.max(0, videoDuration - options.bgmFadeOut)}:d=${options.bgmFadeOut}` : ''
    const volumeOpt = `volume=${options.bgmVolume}`

    const bgmFilters = [volumeOpt, fadeInOpt, fadeOutOpt].filter(Boolean).join(',')

    cmd.outputOptions([
      '-map', '1:v',
      '-map', '0:a',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
    ])

    if (bgmFilters) {
      cmd.audioFilters(bgmFilters)
    }
  } else if (options.mode === 'mixed') {
    // 混合模式
    const fadeInOpt = options.bgmFadeIn > 0 ? `afade=t=in:st=0:d=${options.bgmFadeIn}` : ''
    const fadeOutOpt = options.bgmFadeOut > 0 ? `afade=t=out:st=${Math.max(0, videoDuration - options.bgmFadeOut)}:d=${options.bgmFadeOut}` : ''

    const bgmFilterParts = [`volume=${options.bgmVolume}`]
    if (fadeInOpt) bgmFilterParts.push(fadeInOpt)
    if (fadeOutOpt) bgmFilterParts.push(fadeOutOpt)

    const filterParts = [
      `[0:a]${bgmFilterParts.join(',')}[bgm]`,
      `[1:a]volume=${options.originalVolume}[orig]`,
      `[bgm][orig]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    ]

    cmd.complexFilter(filterParts.join(';'))
    cmd.outputOptions([
      '-map', '1:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
    ])
  }

  cmd.output(outputPath)

  try {
    await runCommand(cmd)
  } catch (err) {
    console.warn(`[FFmpeg] 音频混合失败，保持原始音频: ${(err as Error).message}`)
    copyFileSync(videoPath, outputPath)
  }

  if (!existsSync(outputPath)) {
    throw new Error('音频混合完成但输出文件不存在')
  }

  return outputPath
}