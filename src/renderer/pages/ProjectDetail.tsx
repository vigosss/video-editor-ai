import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import {
  ArrowLeft,
  FileVideo,
  Clock,
  Cpu,
  Wand2,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Play,
  Scissors,
  Upload,
  AlertCircle,
  RefreshCw,
  Film,
  Trash2,
  StopCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Progress } from '../components/ui/Progress'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useProjectStore } from '../stores/projectStore'
import type { Project, ProjectStatus, ProcessingStep, Clip } from '@shared/types'
import type { PipelineProgress } from '@shared/pipeline'
import { MODEL_LABEL_MAP, ANALYSIS_MODE_LABEL_MAP } from '@shared/constants'

/** 处理步骤列表 */
const PROCESSING_STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'parsing', label: '视频解析' },
  { key: 'extracting', label: '音频提取' },
  { key: 'transcribing', label: '语音转录' },
  { key: 'extracting_frames', label: '关键帧抽取' },
  { key: 'analyzing', label: 'AI 分析' },
  { key: 'clipping', label: '视频剪辑' },
  { key: 'embedding_subs', label: '字幕嵌入' },
]

/** 步骤图标 */
function StepIcon({ step, currentStep, status }: { step: ProcessingStep; currentStep: ProcessingStep; status: ProjectStatus }) {
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
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** 格式化日期 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, loading, fetchProject, deleteProject } = useProjectStore()
  const [clips, setClips] = useState<Clip[]>([])
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // 实时进度状态（本地缓存，不通过 store 刷新）
  const [liveProgress, setLiveProgress] = useState<PipelineProgress | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 加载剪辑片段 */
  const loadClips = useCallback((projectId: string) => {
    window.electronAPI.getProjectClips(projectId).then(setClips).catch(() => {})
  }, [])

  useEffect(() => {
    if (id) {
      fetchProject(id)
      loadClips(id)
    }
  }, [id, fetchProject, loadClips])

  /** 监听处理进度 */
  useEffect(() => {
    if (!id) return

    const cleanup = window.electronAPI.onProgress((progress: PipelineProgress) => {
      setLiveProgress(progress)

      // 完成或失败时刷新项目状态和片段列表
      if (progress.step === 'completed') {
        toast.success('视频处理完成！')
        fetchProject(id)
        loadClips(id)
      } else if (progress.step === 'failed') {
        toast.error(progress.message || '处理失败')
        fetchProject(id)
      }
    })

    return cleanup
  }, [id, fetchProject, loadClips])

  /** 处理中的定时轮询（保底机制，每5秒刷新一次） */
  useEffect(() => {
    if (!id) return
    if (currentProject?.status !== 'processing') {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      return
    }

    progressTimerRef.current = setInterval(() => {
      fetchProject(id)
    }, 5000)

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }, [id, currentProject?.status, fetchProject])

  /** 删除项目 */
  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await deleteProject(id)
      toast.success('项目已删除')
      navigate('/projects')
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  /** 重新处理 */
  const handleRetry = async () => {
    if (!id) return
    try {
      await window.electronAPI.startProcess(id)
      toast.success('已重新开始处理')
      setLiveProgress(null)
      fetchProject(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '启动处理失败')
    }
  }

  /** 取消处理 */
  const handleCancel = async () => {
    if (!id) return
    setCancelling(true)
    try {
      await window.electronAPI.cancelProcess(id)
      toast.info('已发送取消请求')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '取消失败')
    } finally {
      setCancelling(false)
    }
  }

  // 加载中
  if (loading && !currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    )
  }

  // 项目不存在
  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12" style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>项目不存在或已被删除</p>
        <Button variant="secondary" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" />
          返回项目列表
        </Button>
      </div>
    )
  }

  const project = currentProject

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {project.name}
          </h2>
          {project.status === 'pending' && <Badge variant="default" dot>等待处理</Badge>}
          {project.status === 'processing' && <Badge variant="processing" dot>处理中</Badge>}
          {project.status === 'completed' && <Badge variant="success" dot>已完成</Badge>}
          {project.status === 'failed' && <Badge variant="error" dot>失败</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {project.status === 'failed' && (
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          )}
          {project.status === 'processing' && (
            <Button variant="secondary" size="sm" onClick={handleCancel} loading={cancelling}>
              <StopCircle className="h-4 w-4" />
              取消处理
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <Card title="项目信息">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <FileVideo className="mr-1 inline h-3 w-3" />
              视频文件
            </span>
            <p className="mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
              {project.videoPath.split('/').pop() || project.videoPath.split('\\').pop()}
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
        </div>
      </Card>

      {/* 处理进度卡片 */}
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

      {/* AI 分析结果卡片 */}
      {clips.length > 0 && (
        <Card title="AI 剪辑结果" description={`共 ${clips.length} 个片段`}>
          <div className="space-y-3">
            {clips.map((clip, idx) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 rounded-xl border p-3"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                    color: 'var(--color-primary)',
                  }}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    <Scissors className="h-3.5 w-3.5 text-primary-400" />
                    {formatTime(clip.startTime)} — {formatTime(clip.endTime)}
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      ({Math.round(clip.endTime - clip.startTime)}秒)
                    </span>
                  </div>
                  {clip.reason && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {clip.reason}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* 视频预览区域 */}
      <Card title="视频预览">
        <div className="grid grid-cols-2 gap-4">
          {/* 原视频 */}
          <div
            className="flex flex-col items-center justify-center rounded-xl border p-6"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
          >
            <FileVideo className="mb-2 h-10 w-10" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>原视频</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {project.status === 'completed' ? '点击播放' : '处理完成后可预览'}
            </p>
          </div>
          {/* 剪辑后视频 */}
          <div
            className="flex flex-col items-center justify-center rounded-xl border p-6"
            style={{
              borderColor: 'var(--border-active)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
            }}
          >
            <Play className="mb-2 h-10 w-10 text-primary-400" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>剪辑后视频</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {project.status === 'completed' ? '点击播放' : '处理完成后可预览'}
            </p>
          </div>
        </div>
      </Card>

      {/* 上传按钮区域 */}
      {project.status === 'completed' && (
        <Card title="一键发布">
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" disabled>
              <Upload className="h-4 w-4" />
              发布到快手
            </Button>
            <Button variant="secondary" className="flex-1" disabled>
              <Upload className="h-4 w-4" />
              发布到抖音
            </Button>
          </div>
          <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            上传功能将在后续版本中实现
          </p>
        </Card>
      )}

      {/* 删除确认弹窗 */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              确认删除
            </Button>
          </>
        }
      >
        <p>
          确定要删除项目「<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{project.name}</span>」吗？此操作不可撤销。
        </p>
      </Modal>
    </motion.div>
  )
}