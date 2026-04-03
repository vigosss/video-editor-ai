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
  { key: 'parsing', label: '视频解析', weight: 10 },
  { key: 'extracting', label: '音频提取', weight: 10 },
  { key: 'transcribing', label: '语音转录', weight: 20 },
  { key: 'extracting_frames', label: '关键帧抽取', weight: 10 },
  { key: 'analyzing', label: 'AI 分析', weight: 20 },
  { key: 'clipping', label: '视频剪辑', weight: 15 },
  { key: 'embedding_subs', label: '字幕嵌入', weight: 15 },
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
