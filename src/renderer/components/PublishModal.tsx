import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Upload, Hash, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Progress } from './ui/Progress'
import type { UploadPlatform, UploadProgress } from '@shared/types'
import { PLATFORM_CONFIGS } from '@shared/platform'

interface PublishModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  platform: UploadPlatform
  onSubmit: (params: { projectId: string; platform: UploadPlatform; title: string; description: string; tags: string }) => Promise<void>
  uploadProgress: UploadProgress | null
}

export function PublishModal({
  open,
  onClose,
  projectId,
  projectName,
  platform,
  onSubmit,
  uploadProgress,
}: PublishModalProps) {
  const config = PLATFORM_CONFIGS[platform]
  const [title, setTitle] = useState(projectName)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // 当平台变化时重置状态
  useEffect(() => {
    setTitle(projectName)
    setDescription('')
    setTags('')
    setSubmitting(false)
    setSubmitted(false)
  }, [platform, projectName])

  // 检测上传完成
  useEffect(() => {
    if (submitted && uploadProgress?.status === 'completed') {
      // 不立即关闭，让用户看到成功状态
    }
  }, [uploadProgress, submitted])

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    setSubmitted(true)
    try {
      await onSubmit({
        projectId,
        platform,
        title: title.trim(),
        description: description.trim(),
        tags: tags.trim(),
      })
    } catch {
      setSubmitting(false)
      setSubmitted(false)
    }
  }

  const isUploading = submitted && uploadProgress?.status === 'uploading'
  const isCompleted = submitted && uploadProgress?.status === 'completed'
  const isFailed = submitted && uploadProgress?.status === 'failed'

  return (
    <Modal
      open={open}
      onClose={onClose}
      showClose={!submitting}
      title={`发布到${config.name}`}
    >
      {/* 平台图标指示 */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: config.color }}
        >
          {config.name[0]}
        </div>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          将视频发布到{config.name}平台
        </span>
      </div>
      <div className="space-y-5">
        {/* 成功状态 */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                发布成功！
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                视频已成功发布到{config.name}
              </p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              完成
            </Button>
          </motion.div>
        )}

        {/* 失败状态 */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                发布失败
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {uploadProgress?.message || '请稍后重试'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>
                关闭
              </Button>
              <Button
                onClick={() => {
                  setSubmitted(false)
                  setSubmitting(false)
                }}
              >
                重试
              </Button>
            </div>
          </motion.div>
        )}

        {/* 上传进度 */}
        {isUploading && uploadProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {uploadProgress.message}
              </span>
            </div>
            <Progress value={uploadProgress.progress} />
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {uploadProgress.progress}% · 请勿关闭此窗口
            </p>
          </motion.div>
        )}

        {/* 编辑表单（未提交时显示） */}
        {!submitted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* 标题 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <FileText className="mr-1 inline h-3.5 w-3.5" />
                视频标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入视频标题"
                maxLength={100}
                className="input-glow w-full"
                style={{ color: 'var(--text-primary)' }}
              />
              <p className="mt-1 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {title.length}/100
              </p>
            </div>

            {/* 描述 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                视频描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加视频描述（可选）"
                rows={3}
                maxLength={500}
                className="input-glow w-full resize-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <p className="mt-1 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {description.length}/500
              </p>
            </div>

            {/* 标签 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Hash className="mr-1 inline h-3.5 w-3.5" />
                标签/话题
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="用逗号分隔多个标签，如：短视频,高光,精彩"
                className="input-glow w-full"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button
                glow
                onClick={handleSubmit}
                disabled={!title.trim()}
                style={{ background: config.color }}
              >
                <Upload className="h-4 w-4" />
                发布到{config.name}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  )
}