import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import type { ProcessingStep, ProjectStatus } from '@shared/types'

/** 处理步骤列表 */
export const PROCESSING_STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'normalizing', label: '视频合并' },
  { key: 'parsing', label: '视频解析' },
  { key: 'extracting', label: '音频提取' },
  { key: 'transcribing', label: '语音转录' },
  { key: 'extracting_frames', label: '关键帧抽取' },
  { key: 'detecting_beats', label: '节拍分析' },
  { key: 'analyzing', label: 'AI 分析' },
  { key: 'clipping', label: '视频剪辑' },
  { key: 'embedding_subs', label: '字幕嵌入' },
  { key: 'mixing_audio', label: '音频混音' },
]

/** 步骤图标 */
export function StepIcon({ step, currentStep, status }: { step: ProcessingStep; currentStep: ProcessingStep; status: ProjectStatus }) {
  const stepIndex = PROCESSING_STEPS.findIndex((s) => s.key === step)
  const currentIndex = PROCESSING_STEPS.findIndex((s) => s.key === currentStep)

  if (status === 'completed' || stepIndex < currentIndex) {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />
  }
  if (stepIndex === currentIndex && status === 'processing') {
    return <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
  }
  if (status === 'failed' && stepIndex === currentIndex) {
    return <XCircle className="h-5 w-5 text-red-500" />
  }
  return <Circle className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
}

/** 格式化时间戳 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** 格式化日期 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}