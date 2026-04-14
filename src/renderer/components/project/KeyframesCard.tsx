import { useState } from 'react'
import { Image, ChevronDown, Loader2, Eye, FolderOpen } from 'lucide-react'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { FrameFileInfo } from '@shared/types'
import { formatTime } from './constants'

interface KeyframesCardProps {
  projectId: string | undefined
  frameFiles: FrameFileInfo[]
  showFrames: boolean
  onToggleFrames: (show: boolean) => void
  onLoadFrameFileList: () => void
}

export function KeyframesCard({ projectId, frameFiles, showFrames, onToggleFrames, onLoadFrameFileList }: KeyframesCardProps) {
  const [previewFrame, setPreviewFrame] = useState<FrameFileInfo | null>(null)

  return (
    <>
      <Card title="关键帧预览" description="AI 分析时抽取的视频关键帧">
        <button
          className="flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
          onClick={() => {
            onToggleFrames(!showFrames)
            if (!showFrames) {
              onLoadFrameFileList()
            }
          }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
            }}
          >
            <Image className="h-4 w-4 text-primary-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {frameFiles.length > 0 ? `${frameFiles.length} 张关键帧` : '查看关键帧图片'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {showFrames ? '点击收起' : '点击展开预览'}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showFrames ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>

        {/* 关键帧网格 */}
        {showFrames && frameFiles.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {frameFiles.map((frame) => (
              <div
                key={frame.index}
                className="group relative cursor-pointer overflow-hidden rounded-lg border"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={() => {
                  if (frame.dataUrl) {
                    setPreviewFrame(frame)
                  } else {
                    window.electronAPI.openPath(frame.path)
                  }
                }}
              >
                {frame.dataUrl ? (
                  <img
                    src={frame.dataUrl}
                    alt={`帧 ${frame.index}`}
                    className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex aspect-video w-full items-center justify-center"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {frame.exists ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
                    ) : (
                      <Image className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                )}
                {/* 时间戳标签 */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 text-center text-[10px] font-medium"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                >
                  {formatTime(frame.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 关键帧放大查看弹窗 */}
      <Modal
        open={!!previewFrame}
        onClose={() => setPreviewFrame(null)}
        title={previewFrame ? `关键帧 #${previewFrame.index} — ${formatTime(previewFrame.timestamp)}` : ''}
      >
        {previewFrame?.dataUrl && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewFrame.dataUrl}
              alt={`帧 ${previewFrame.index}`}
              className="max-h-[70vh] w-auto rounded-lg"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.electronAPI.openPath(previewFrame.path)}
              >
                <Eye className="mr-1 h-3.5 w-3.5" />
                用系统程序查看
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const dir = previewFrame.path.split('/').slice(0, -1).join('/')
                  window.electronAPI.openPath(dir)
                }}
              >
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                打开所在目录
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}