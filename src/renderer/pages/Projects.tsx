import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import {
  FolderOpen,
  Plus,
  Trash2,
  FileVideo,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Progress } from '../components/ui/Progress'
import { Modal } from '../components/ui/Modal'
import { useProjectStore } from '../stores/projectStore'
import type { Project, ProjectStatus } from '@shared/types'

/** 项目状态 → Badge 变体映射 */
function getStatusBadge(status: ProjectStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="default" dot>等待处理</Badge>
    case 'processing':
      return <Badge variant="processing" dot>处理中</Badge>
    case 'completed':
      return <Badge variant="success" dot>已完成</Badge>
    case 'failed':
      return <Badge variant="error" dot>失败</Badge>
  }
}

/** 项目状态图标 */
function getStatusIcon(status: ProjectStatus) {
  switch (status) {
    case 'pending':
      return <Clock className="h-5 w-5 text-[var(--text-tertiary)]" />
    case 'processing':
      return <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />
  }
}

/** 格式化时间 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 7) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN')
}

/** 处理步骤中文映射 */
const STEP_LABELS: Record<string, string> = {
  idle: '等待中',
  normalizing: '视频合并',
  parsing: '视频解析',
  extracting: '音频提取',
  transcribing: '语音转录',
  extracting_frames: '关键帧抽取',
  analyzing: 'AI 分析',
  clipping: '视频剪辑',
  embedding_subs: '字幕嵌入',
  completed: '已完成',
  failed: '失败',
}

export default function Projects() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore()
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  /** 确认删除项目 */
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProject(deleteTarget.id)
      toast.success('项目已删除')
      setDeleteTarget(null)
    } catch (err) {
      toast.error('删除项目失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 标题栏 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          项目列表
        </h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/create')}>
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </div>

      {/* 加载状态 */}
      {loading && projects.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && projects.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-20">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
            }}
          >
            <FolderOpen className="h-10 w-10 text-primary-400" />
          </div>
          <p className="mb-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
            暂无项目
          </p>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            返回首页创建你的第一个 AI 剪辑项目
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/create')}>
            <Plus className="h-4 w-4" />
            创建项目
          </Button>
        </div>
      )}

      {/* 项目列表 */}
      {projects.length > 0 && (
        <div className="grid gap-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card group cursor-pointer p-5 transition-all duration-200"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-start gap-4">
                {/* 状态图标 */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                  }}
                >
                  {getStatusIcon(project.status)}
                </div>

                {/* 项目信息 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <h3
                      className="truncate text-base font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {project.name}
                    </h3>
                    {getStatusBadge(project.status)}
                  </div>

                  <div className="mb-2 flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-1">
                      <FileVideo className="h-3 w-3" />
                      {project.videoPaths && project.videoPaths.length > 1
                        ? `${project.videoPaths.length} 个视频`
                        : (project.videoPath.split('/').pop() || project.videoPath.split('\\').pop())}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(project.createdAt)}
                    </span>
                    {project.status === 'processing' && project.currentStep !== 'idle' && (
                      <span style={{ color: 'var(--color-primary)' }}>
                        {STEP_LABELS[project.currentStep] || project.currentStep}
                      </span>
                    )}
                  </div>

                  {/* 进度条 */}
                  {(project.status === 'processing' || project.status === 'completed') && (
                    <Progress value={project.progress} size="sm" className="max-w-xs" />
                  )}

                  {/* 错误信息 */}
                  {project.status === 'failed' && project.errorMessage && (
                    <div className="mt-2 flex items-start gap-1.5 overflow-hidden text-xs text-red-500">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{project.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* 删除按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(project)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              确认删除
            </Button>
          </>
        }
      >
        <p>
          确定要删除项目「<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</span>」吗？此操作不可撤销。
        </p>
      </Modal>
    </motion.div>
  )
}