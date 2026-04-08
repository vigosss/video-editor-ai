// ==========================================
// 处理管线类型定义
// ==========================================

import type { ProcessingStep } from './project'

/** 管线步骤进度 */
export interface PipelineProgress {
  step: ProcessingStep
  progress: number       // 当前步骤进度 0-100
  overallProgress: number // 总体进度 0-100
  message: string
}

/** 管线步骤配置 */
export interface PipelineStepConfig {
  key: ProcessingStep
  label: string
  weight: number  // 该步骤在总体进度中的权重占比
}

/** 管线步骤列表（有序） */
export const PIPELINE_STEPS: PipelineStepConfig[] = [
  { key: 'normalizing', label: '视频合并', weight: 10 },
  { key: 'parsing', label: '视频解析', weight: 10 },
  { key: 'extracting', label: '音频提取', weight: 10 },
  { key: 'transcribing', label: '语音转录', weight: 15 },
  { key: 'extracting_frames', label: '关键帧抽取', weight: 10 },
  { key: 'detecting_beats', label: '节拍分析', weight: 5 },
  { key: 'analyzing', label: 'AI 分析', weight: 20 },
  { key: 'clipping', label: '视频剪辑', weight: 15 },
  { key: 'embedding_subs', label: '字幕嵌入', weight: 10 },
  { key: 'mixing_audio', label: '音频混音', weight: 5 },
]

/** 队列中的项目状态 */
export interface QueueItem {
  projectId: string
  status: 'waiting' | 'processing' | 'cancelled'
  addedAt: number  // timestamp
}

/** 队列状态 */
export interface QueueStatus {
  currentProjectId: string | null
  queue: QueueItem[]
  isProcessing: boolean
}

/** 不需要字幕时跳过的步骤 key */
const SUBTITLE_STEP_KEYS = ['extracting', 'transcribing', 'embedding_subs']

/** 需要 BGM 时才执行的步骤 key */
const BGM_STEP_KEYS = ['detecting_beats', 'mixing_audio']

/** 获取活跃步骤的参数 */
export interface GetActiveStepsOptions {
  needsSubtitles: boolean
  bgmTrackId?: string | null
  beatSyncMode?: string
  audioMode?: string
}

/** 根据项目配置，返回活跃步骤列表（权重按比例重新分配） */
export function getActiveSteps(options: boolean | GetActiveStepsOptions): PipelineStepConfig[] {
  // 兼容旧的 boolean 参数
  const opts: GetActiveStepsOptions = typeof options === 'boolean'
    ? { needsSubtitles: options }
    : options

  const hasBgm = !!opts.bgmTrackId
  const hasBeatSync = hasBgm && opts.beatSyncMode && opts.beatSyncMode !== 'none'
  const hasAudioMixing = hasBgm && opts.audioMode && opts.audioMode !== 'original'

  const steps = PIPELINE_STEPS.filter(s => {
    // 字幕相关步骤
    if (SUBTITLE_STEP_KEYS.includes(s.key) && !opts.needsSubtitles) return false
    // 节拍检测步骤：需要 BGM + 启用节拍同步
    if (s.key === 'detecting_beats' && !hasBeatSync) return false
    // 音频混音步骤：需要 BGM + 非原始音频模式
    if (s.key === 'mixing_audio' && !hasAudioMixing) return false
    return true
  })

  const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0)
  return steps.map(s => ({
    ...s,
    weight: Math.round((s.weight / totalWeight) * 100),
  }))
}
