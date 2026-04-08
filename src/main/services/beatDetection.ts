// ==========================================
// 节拍检测服务 — 基于能量包络的 onset 检测
// ==========================================

import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { getTempDir } from '../utils/paths'
import { decodeAudioToWav } from './ffmpeg'
import { getBgmTrackPath } from './bgm'
import { getDatabase } from './database'
import type { BeatInfo } from '../../shared/bgm'

// ==========================================
// WAV 文件解析
// ==========================================

interface WavHeader {
  sampleRate: number
  numChannels: number
  bitsPerSample: number
  dataOffset: number
  dataSize: number
}

/** 解析 WAV 文件头，返回元信息 */
function parseWavHeader(buffer: Buffer): WavHeader {
  // 检查 RIFF 标识
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('不是有效的 WAV 文件')
  }
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('不是有效的 WAV 文件')
  }

  let offset = 12
  let sampleRate = 44100
  let numChannels = 2
  let bitsPerSample = 16
  let dataOffset = 0
  let dataSize = 0

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)

    if (chunkId === 'fmt ') {
      // 格式块
      const audioFormat = buffer.readUInt16LE(offset + 8)
      if (audioFormat !== 1) {
        throw new Error(`不支持的 WAV 格式: ${audioFormat}（仅支持 PCM）`)
      }
      numChannels = buffer.readUInt16LE(offset + 10)
      sampleRate = buffer.readUInt32LE(offset + 12)
      bitsPerSample = buffer.readUInt16LE(offset + 22)
    } else if (chunkId === 'data') {
      dataOffset = offset + 8
      dataSize = chunkSize
      break
    }

    offset += 8 + chunkSize
    // 确保对齐到偶数
    if (chunkSize % 2 !== 0) offset++
  }

  if (dataOffset === 0) {
    throw new Error('WAV 文件中未找到 data 块')
  }

  return { sampleRate, numChannels, bitsPerSample, dataOffset, dataSize }
}

/** 将 WAV PCM 数据转为 Float32Array（单声道，归一化到 -1.0 ~ 1.0） */
function pcmToFloat32(buffer: Buffer, header: WavHeader): Float32Array {
  const bytesPerSample = header.bitsPerSample / 8
  const totalSamples = Math.floor(header.dataSize / bytesPerSample)
  const channelSamples = Math.floor(totalSamples / header.numChannels)
  const samples = new Float32Array(channelSamples)

  const dataStart = header.dataOffset

  for (let i = 0; i < channelSamples; i++) {
    let sum = 0
    for (let ch = 0; ch < header.numChannels; ch++) {
      const sampleOffset = dataStart + (i * header.numChannels + ch) * bytesPerSample
      if (sampleOffset + bytesPerSample > buffer.length) break

      let value: number
      if (header.bitsPerSample === 16) {
        value = buffer.readInt16LE(sampleOffset) / 32768.0
      } else if (header.bitsPerSample === 24) {
        value = buffer.readInt32LE(sampleOffset) / 8388608.0 // 读取 3 字节需要处理
        // 简化：用 32 位读取然后缩放
        const b0 = buffer[sampleOffset]
        const b1 = buffer[sampleOffset + 1]
        const b2 = buffer[sampleOffset + 2]
        value = ((b0 | (b1 << 8) | (b2 << 16)) << 8) >> 8 // 符号扩展
        value = value / 8388608.0
      } else {
        value = 0
      }
      sum += value
    }
    samples[i] = sum / header.numChannels
  }

  return samples
}

// ==========================================
// 能量包络节拍检测算法
// ==========================================

interface EnergyWindow {
  time: number    // 窗口中心时间（秒）
  energy: number  // RMS 能量
}

/** 计算 RMS 能量包络 */
function computeEnergyEnvelope(
  samples: Float32Array,
  sampleRate: number,
  windowSize: number = 1024,
  hopSize: number = 512,
): EnergyWindow[] {
  const windows: EnergyWindow[] = []
  const numWindows = Math.floor((samples.length - windowSize) / hopSize)

  for (let i = 0; i < numWindows; i++) {
    const start = i * hopSize
    let sumSquares = 0

    for (let j = 0; j < windowSize; j++) {
      const s = samples[start + j]
      sumSquares += s * s
    }

    const rms = Math.sqrt(sumSquares / windowSize)
    const time = (start + windowSize / 2) / sampleRate

    windows.push({ time, energy: rms })
  }

  return windows
}

/** 移动平均平滑 */
function smoothEnergy(windows: EnergyWindow[], smoothSize: number = 10): EnergyWindow[] {
  return windows.map((w, i) => {
    const start = Math.max(0, i - Math.floor(smoothSize / 2))
    const end = Math.min(windows.length, i + Math.ceil(smoothSize / 2))
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += windows[j].energy
    }
    return { ...w, energy: sum / (end - start) }
  })
}

/** 检测能量峰值（节拍点） */
function detectPeaks(
  windows: EnergyWindow[],
  thresholdMultiplier: number = 1.2,
  minSpacingSeconds: number = 0.25,
): number[] {
  if (windows.length === 0) return []

  // 计算全局能量统计
  const energies = windows.map(w => w.energy)
  const mean = energies.reduce((a, b) => a + b, 0) / energies.length
  const variance = energies.reduce((a, b) => a + (b - mean) ** 2, 0) / energies.length
  const stddev = Math.sqrt(variance)
  const threshold = mean + thresholdMultiplier * stddev

  // 检测峰值
  const peaks: number[] = []
  let lastPeakTime = -Infinity

  for (let i = 1; i < windows.length - 1; i++) {
    const prev = windows[i - 1].energy
    const curr = windows[i].energy
    const next = windows[i + 1].energy

    // 峰值条件：大于阈值 且 大于相邻窗口
    if (curr > threshold && curr > prev && curr > next) {
      const time = windows[i].time

      // 最小间距约束
      if (time - lastPeakTime >= minSpacingSeconds) {
        peaks.push(time)
        lastPeakTime = time
      }
    }
  }

  return peaks
}

/** 从节拍间隔计算 BPM */
function calculateBPM(beatTimes: number[]): number {
  if (beatTimes.length < 2) return 120

  const intervals: number[] = []
  for (let i = 1; i < beatTimes.length; i++) {
    intervals.push(beatTimes[i] - beatTimes[i - 1])
  }

  // 使用中位数计算 BPM（比平均值更鲁棒）
  intervals.sort((a, b) => a - b)
  const medianInterval = intervals[Math.floor(intervals.length / 2)]

  return Math.round(60 / medianInterval)
}

/** 调整检测灵敏度以获得合理数量的节拍 */
function adaptiveDetect(
  samples: Float32Array,
  sampleRate: number,
  audioDuration: number,
): { beats: number[]; bpm: number; confidence: number } {
  const windowSize = 1024
  const hopSize = 512

  // 计算能量包络
  let windows = computeEnergyEnvelope(samples, sampleRate, windowSize, hopSize)
  windows = smoothEnergy(windows, 10)

  // 尝试不同的阈值倍数
  const thresholdOptions = [1.0, 1.2, 1.5, 0.8, 0.6]
  let bestBeats: number[] = []
  let bestConfidence = 0

  for (const multiplier of thresholdOptions) {
    const beats = detectPeaks(windows, multiplier, 0.25)

    if (beats.length < 2) continue

    const bpm = calculateBPM(beats)

    // 评估合理性
    if (bpm >= 40 && bpm <= 220) {
      // 估算预期的节拍数
      const expectedBeats = (audioDuration * bpm) / 60
      const ratio = beats.length / expectedBeats
      const confidence = Math.max(0, 1 - Math.abs(ratio - 1) * 0.5)

      if (confidence > bestConfidence) {
        bestBeats = beats
        bestConfidence = confidence
      }

      // 如果已经找到足够好的结果就停止
      if (confidence > 0.7) break
    }
  }

  // 如果没找到合理的节拍，fallback
  if (bestBeats.length < 4) {
    // 使用均匀分布的 120 BPM
    const fallbackBpm = 120
    const interval = 60 / fallbackBpm
    const beats: number[] = []
    for (let t = 0; t < audioDuration; t += interval) {
      beats.push(t)
    }
    return { beats, bpm: fallbackBpm, confidence: 0.2 }
  }

  const bpm = calculateBPM(bestBeats)
  return { beats: bestBeats, bpm, confidence: bestConfidence }
}

// ==========================================
// 公开 API
// ==========================================

/** 分析音频文件的节拍 */
export async function analyzeBeats(audioPath: string): Promise<BeatInfo> {
  if (!existsSync(audioPath)) {
    throw new Error(`音频文件不存在: ${audioPath}`)
  }

  // 解码为 WAV（44.1kHz 立体声，保证分析质量）
  const tempDir = getTempDir()
  const wavPath = join(tempDir, `beats_${Date.now()}.wav`)

  try {
    await decodeAudioToWav(audioPath, wavPath, 44100)

    // 读取 WAV 文件
    const buffer = readFileSync(wavPath)
    const header = parseWavHeader(buffer)
    const samples = pcmToFloat32(buffer, header)
    const audioDuration = samples.length / header.sampleRate

    console.log(`[BeatDetection] 音频信息: 时长=${audioDuration.toFixed(1)}s, 采样率=${header.sampleRate}Hz, 通道数=${header.numChannels}`)

    // 自适应节拍检测
    const result = adaptiveDetect(samples, header.sampleRate, audioDuration)

    console.log(`[BeatDetection] 检测结果: ${result.beats.length} 个节拍, BPM=${result.bpm}, 置信度=${result.confidence.toFixed(2)}`)

    return {
      timestamps: result.beats,
      bpm: result.bpm,
      confidence: result.confidence,
    }
  } finally {
    // 清理临时 WAV 文件
    if (existsSync(wavPath)) {
      try { unlinkSync(wavPath) } catch { /* 忽略 */ }
    }
  }
}

/** 获取指定 BGM 曲目的节拍信息（带缓存） */
export async function getBeatsForTrack(trackId: string): Promise<BeatInfo> {
  const db = getDatabase()

  // 查缓存
  const row = db.prepare('SELECT * FROM bgm_beat_cache WHERE bgm_track_id = ?').get(trackId) as
    | { beat_data: string; bpm: number; confidence: number }
    | undefined

  if (row) {
    return {
      timestamps: JSON.parse(row.beat_data),
      bpm: row.bpm,
      confidence: row.confidence,
    }
  }

  // 执行分析
  const trackPath = getBgmTrackPath(trackId)
  const beatInfo = await analyzeBeats(trackPath)

  // 存入缓存
  db.prepare(
    'INSERT OR REPLACE INTO bgm_beat_cache (bgm_track_id, beat_data, bpm, confidence, analyzed_at) VALUES (?, ?, ?, ?, datetime("now"))',
  ).run(trackId, JSON.stringify(beatInfo.timestamps), beatInfo.bpm, beatInfo.confidence)

  return beatInfo
}

/** 将片段时间对齐到最近的节拍点 */
export function alignClipsToBeats(
  clips: Array<{ startTime: number; endTime: number }>,
  beatInfo: BeatInfo,
  tolerance: number = 0.5,
): Array<{ startTime: number; endTime: number; aligned: boolean }> {
  const { timestamps } = beatInfo

  if (timestamps.length === 0) {
    return clips.map(c => ({ ...c, aligned: false }))
  }

  return clips.map(clip => {
    // 找到最近的节拍点
    const alignedStart = findNearestBeat(clip.startTime, timestamps, tolerance)
    const alignedEnd = findNearestBeat(clip.endTime, timestamps, tolerance)

    // 确保结束时间大于开始时间
    if (alignedEnd !== null && alignedStart !== null && alignedEnd <= alignedStart) {
      // 如果对齐后时间无效，保持原始时间
      return { startTime: clip.startTime, endTime: clip.endTime, aligned: false }
    }

    return {
      startTime: alignedStart ?? clip.startTime,
      endTime: alignedEnd ?? clip.endTime,
      aligned: alignedStart !== null && alignedEnd !== null,
    }
  })
}

/** 找到最近的节拍点（在容差范围内） */
function findNearestBeat(time: number, beats: number[], tolerance: number): number | null {
  let nearest = beats[0]
  let minDist = Math.abs(time - nearest)

  for (let i = 1; i < beats.length; i++) {
    const dist = Math.abs(time - beats[i])
    if (dist < minDist) {
      minDist = dist
      nearest = beats[i]
    }
  }

  return minDist <= tolerance ? nearest : null
}

/** 按节拍分段（用于 beat_segment 模式） */
export function segmentByBeats(
  beatInfo: BeatInfo,
  beatsPerSegment: number = 4,
  maxDuration?: number,
): Array<{ startTime: number; endTime: number; beatRange: string }> {
  const { timestamps } = beatInfo
  const segments: Array<{ startTime: number; endTime: number; beatRange: string }> = []

  for (let i = 0; i < timestamps.length; i += beatsPerSegment) {
    const startTime = timestamps[i]
    const endIdx = Math.min(i + beatsPerSegment, timestamps.length - 1)
    const endTime = timestamps[endIdx]

    // 如果有最大时长限制，且该段超过限制，则跳过
    if (maxDuration && (endTime - startTime) > maxDuration) continue

    segments.push({
      startTime,
      endTime,
      beatRange: `Beat ${i + 1}-${endIdx + 1}`,
    })
  }

  return segments
}
