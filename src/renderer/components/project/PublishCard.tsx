import { FolderOpen } from 'lucide-react'
import { Card } from '../ui/Card'
import type { Project } from '@shared/types'

interface PublishCardProps {
  project: Project
}

export function PublishCard({ project }: PublishCardProps) {
  if (project.status !== 'completed') return null

  return (
    <Card title="发布视频" description="视频处理完成，请手动上传到短视频平台">
      <div
        className="flex flex-col items-center gap-4 rounded-xl border p-6"
        style={{
          borderColor: 'var(--border-color)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(139, 92, 246, 0.03))',
        }}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
          }}
        >
          <FolderOpen className="h-7 w-7 text-primary-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            一键发布功能暂不可用
          </p>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            视频已处理完成，请前往输出目录找到剪辑后的视频文件，
            <br />
            手动上传到快手、抖音等短视频平台。
          </p>
          <p className="mt-3 rounded-lg px-3 py-2 text-xs font-mono" style={{ color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.08)' }}>
            {project.outputPath}
          </p>
        </div>
      </div>
    </Card>
  )
}