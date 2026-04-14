import { Play, Film } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { Project, IntermediateVideo } from '@shared/types'

interface VideoPreviewCardProps {
  project: Project
  intermediateVideos: IntermediateVideo[]
}

export function VideoPreviewCard({ project, intermediateVideos }: VideoPreviewCardProps) {
  return (
    <Card title="视频预览">
      <div className="space-y-3">
        {/* 中间视频（合并后原视频、剪辑后视频） */}
        {intermediateVideos.map((video) => (
          <div
            key={video.path}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              video.exists ? 'cursor-pointer' : 'opacity-50'
            }`}
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--bg-tertiary)',
            }}
            onClick={() => {
              if (video.exists) {
                window.electronAPI.openPath(video.path)
              }
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
              }}
            >
              <Play className="h-4 w-4 text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {video.label}
              </p>
              <p className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {video.path.split('/').pop() || video.path.split('\\').pop()}
              </p>
            </div>
            <Badge variant={video.exists ? 'success' : 'default'}>
              {video.exists ? '可播放' : '未生成'}
            </Badge>
          </div>
        ))}

        {/* 最终成片 */}
        <div
          className={`flex items-center gap-3 rounded-xl border p-3 ${
            project.status === 'completed' && project.outputPath ? 'cursor-pointer' : 'opacity-50'
          }`}
          style={{
            borderColor: 'var(--border-active)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
          }}
          onClick={() => {
            if (project.status === 'completed' && project.outputPath) {
              window.electronAPI.openPath(project.outputPath)
            }
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
            }}
          >
            <Film className="h-4 w-4 text-primary-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              最终成片
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {project.outputPath
                ? (project.outputPath.split('/').pop() || project.outputPath.split('\\').pop())
                : '处理完成后可预览'}
            </p>
          </div>
          {project.status === 'completed' && project.outputPath ? (
            <Badge variant="success" dot>已完成</Badge>
          ) : (
            <Badge variant="default">未生成</Badge>
          )}
        </div>
      </div>
    </Card>
  )
}