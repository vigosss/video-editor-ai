import { motion } from 'motion/react'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useProjectDetail } from '../hooks/useProjectDetail'
import { ProjectHeader } from '../components/project/ProjectHeader'
import { ProjectInfoCard } from '../components/project/ProjectInfoCard'
import { ProcessingProgressCard } from '../components/project/ProcessingProgressCard'
import { ClipsCard } from '../components/project/ClipsCard'
import { KeyframesCard } from '../components/project/KeyframesCard'
import { VideoPreviewCard } from '../components/project/VideoPreviewCard'
import { PublishCard } from '../components/project/PublishCard'

export default function ProjectDetail() {
  const {
    id,
    navigate,
    project,
    loading,
    clips,
    liveProgress,
    thinkingContent,
    showThinking,
    setShowThinking,
    frameFiles,
    showFrames,
    setShowFrames,
    intermediateVideos,
    editingClips,
    editedClips,
    reRendering,
    handleStartEditClips,
    handleCancelEditClips,
    updateEditedClip,
    removeEditedClip,
    moveEditedClipUp,
    moveEditedClipDown,
    handleReRender,
    deleting,
    showDeleteModal,
    setShowDeleteModal,
    cancelling,
    handleDelete,
    handleRetry,
    handleCancel,
    loadFrameFileList,
  } = useProjectDetail()

  // 加载中
  if (loading && !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    )
  }

  // 项目不存在
  if (!project) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 顶部导航 */}
      <ProjectHeader
        project={project}
        navigate={navigate}
        cancelling={cancelling}
        onRetry={handleRetry}
        onCancel={handleCancel}
        onDeleteClick={() => setShowDeleteModal(true)}
      />

      {/* 基本信息卡片 */}
      <ProjectInfoCard project={project} />

      {/* 处理进度卡片 */}
      <ProcessingProgressCard
        project={project}
        liveProgress={liveProgress}
        thinkingContent={thinkingContent}
        showThinking={showThinking}
        onToggleThinking={setShowThinking}
      />

      {/* AI 剪辑结果卡片 */}
      <ClipsCard
        clips={clips}
        projectStatus={project.status}
        editingClips={editingClips}
        editedClips={editedClips}
        reRendering={reRendering}
        onStartEdit={handleStartEditClips}
        onCancelEdit={handleCancelEditClips}
        onUpdateClip={updateEditedClip}
        onRemoveClip={removeEditedClip}
        onMoveUp={moveEditedClipUp}
        onMoveDown={moveEditedClipDown}
        onReRender={handleReRender}
      />

      {/* 关键帧预览卡片 */}
      {project.status === 'completed' && (
        <KeyframesCard
          projectId={id}
          frameFiles={frameFiles}
          showFrames={showFrames}
          onToggleFrames={setShowFrames}
          onLoadFrameFileList={loadFrameFileList}
        />
      )}

      {/* 视频预览区域 */}
      <VideoPreviewCard project={project} intermediateVideos={intermediateVideos} />

      {/* 发布卡片 */}
      <PublishCard project={project} />

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