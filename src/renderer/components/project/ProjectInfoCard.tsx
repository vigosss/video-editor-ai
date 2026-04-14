import { FileVideo, Clock, Cpu, Wand2, Film, Music } from 'lucide-react'
import { Card } from '../ui/Card'
import type { Project } from '@shared/types'
import { MODEL_LABEL_MAP, ANALYSIS_MODE_LABEL_MAP, AUDIO_MODE_LABEL_MAP, BEAT_SYNC_MODE_LABEL_MAP, TRANSITION_TYPE_LABEL_MAP } from '@shared/constants'
import { formatDate } from './constants'

interface ProjectInfoCardProps {
  project: Project
}

export function ProjectInfoCard({ project }: ProjectInfoCardProps) {
  return (
    <Card title="项目信息">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <FileVideo className="mr-1 inline h-3 w-3" />
            视频文件
          </span>
          <p className="mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
            {project.videoPaths && project.videoPaths.length > 1
              ? `${project.videoPaths.length} 个视频文件`
              : (project.videoPath.split('/').pop() || project.videoPath.split('\\').pop())}
          </p>
        </div>
        <div>
          <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Cpu className="mr-1 inline h-3 w-3" />
            AI 模型
          </span>
          <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {MODEL_LABEL_MAP[project.model] ?? project.model}
          </p>
        </div>
        <div>
          <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Clock className="mr-1 inline h-3 w-3" />
            创建时间
          </span>
          <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{formatDate(project.createdAt)}</p>
        </div>
        <div>
          <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Film className="mr-1 inline h-3 w-3" />
            分析模式
          </span>
          <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {ANALYSIS_MODE_LABEL_MAP[project.analysisMode] ?? project.analysisMode}
          </p>
        </div>
        {project.prompt && (
          <div className="col-span-2">
            <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <Wand2 className="mr-1 inline h-3 w-3" />
              剪辑需求
            </span>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
              {project.prompt}
            </p>
          </div>
        )}
        {project.bgmTrackId && (
          <>
            <div>
              <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <Music className="mr-1 inline h-3 w-3" />
                背景音乐
              </span>
              <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {AUDIO_MODE_LABEL_MAP[project.audioMode] ?? project.audioMode}
              </p>
            </div>
            <div>
              <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
                节拍同步
              </span>
              <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {BEAT_SYNC_MODE_LABEL_MAP[project.beatSyncMode] ?? project.beatSyncMode}
              </p>
            </div>
            {project.transitionType && project.transitionType !== 'none' && (
              <div>
                <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  转场效果
                </span>
                <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {TRANSITION_TYPE_LABEL_MAP[project.transitionType]} ({project.transitionDuration}s)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}