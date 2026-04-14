import { ArrowLeft, RefreshCw, StopCircle, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { Project, ProjectStatus } from '@shared/types'
import { NavigateFunction } from 'react-router-dom'

interface ProjectHeaderProps {
  project: Project
  navigate: NavigateFunction
  cancelling: boolean
  onRetry: () => void
  onCancel: () => void
  onDeleteClick: () => void
}

const STATUS_BADGE_MAP: Record<ProjectStatus, { variant: 'default' | 'processing' | 'success' | 'error'; label: string }> = {
  pending: { variant: 'default', label: '等待处理' },
  processing: { variant: 'processing', label: '处理中' },
  completed: { variant: 'success', label: '已完成' },
  failed: { variant: 'error', label: '失败' },
}

export function ProjectHeader({ project, navigate, cancelling, onRetry, onCancel, onDeleteClick }: ProjectHeaderProps) {
  const badge = STATUS_BADGE_MAP[project.status]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {project.name}
        </h2>
        <Badge variant={badge.variant} dot>{badge.label}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {project.status === 'failed' && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            重试
          </Button>
        )}
        {project.status === 'processing' && (
          <Button variant="secondary" size="sm" onClick={onCancel} loading={cancelling}>
            <StopCircle className="h-4 w-4" />
            取消处理
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDeleteClick}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}