import { Cpu, AlertCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Progress } from '../ui/Progress'
import type { Project } from '@shared/types'
import type { PipelineProgress } from '@shared/pipeline'
import { PROCESSING_STEPS, StepIcon } from './constants'

interface ProcessingProgressCardProps {
  project: Project
  liveProgress: PipelineProgress | null
  thinkingContent: string
  showThinking: boolean
  onToggleThinking: (show: boolean) => void
}

export function ProcessingProgressCard({
  project,
  liveProgress,
  thinkingContent,
  showThinking,
  onToggleThinking,
}: ProcessingProgressCardProps) {
  return (
    <Card title="处理进度">
      {/* 总进度条 */}
      <Progress
        value={liveProgress?.overallProgress ?? project.progress}
        size="lg"
        showPercent
        label={`总体进度 · ${project.status === 'completed' ? '已完成' : project.status === 'failed' ? '失败' : liveProgress?.message ?? '处理中'}`}
        className="mb-6"
      />

      {/* 步骤列表 */}
      <div className="space-y-3">
        {PROCESSING_STEPS.map((step) => (
          <div key={step.key} className="flex items-center gap-3">
            <StepIcon step={step.key} currentStep={project.currentStep} status={project.status} />
            <span
              className="text-sm"
              style={{
                color:
                  project.currentStep === step.key && project.status === 'processing'
                    ? 'var(--color-primary)'
                    : 'var(--text-secondary)',
              }}
            >
              {step.label}
            </span>
            {/* 当前步骤的实时进度消息 */}
            {liveProgress && liveProgress.step === step.key && project.status === 'processing' && (
              <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {liveProgress.message}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* AI 思考过程 */}
      {thinkingContent && (
        <div className="mt-4 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => onToggleThinking(!showThinking)}
          >
            <Cpu className="h-4 w-4 text-primary-400" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              老兵AI 思考过程
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {thinkingContent.length > 0 && `(${Math.round(thinkingContent.length / 2)}字)`}
            </span>
            <svg
              className={`ml-auto h-4 w-4 transition-transform ${showThinking ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showThinking && (
            <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
              <div
                className="max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--text-secondary)', fontFamily: 'system-ui, sans-serif' }}
              >
                {thinkingContent}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {project.status === 'failed' && project.errorMessage && (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 p-3"
          style={{ background: 'rgba(239, 68, 68, 0.05)' }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-500">{project.errorMessage}</p>
        </div>
      )}
    </Card>
  )
}