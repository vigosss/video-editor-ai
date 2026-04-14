import { motion } from 'motion/react'
import { Scissors, AlertCircle, Pencil, ArrowUp, ArrowDown, Save, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { Clip, ProjectStatus } from '@shared/types'
import { formatTime } from './constants'

interface EditedClip {
  startTime: number
  endTime: number
  reason: string
}

interface ClipsCardProps {
  clips: Clip[]
  projectStatus: ProjectStatus
  editingClips: boolean
  editedClips: EditedClip[]
  reRendering: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onUpdateClip: (index: number, field: 'startTime' | 'endTime' | 'reason', value: number | string) => void
  onRemoveClip: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onReRender: () => void
}

export function ClipsCard({
  clips,
  projectStatus,
  editingClips,
  editedClips,
  reRendering,
  onStartEdit,
  onCancelEdit,
  onUpdateClip,
  onRemoveClip,
  onMoveUp,
  onMoveDown,
  onReRender,
}: ClipsCardProps) {
  if (clips.length === 0) return null

  return (
    <Card
      title={editingClips ? '编辑剪辑片段' : 'AI 剪辑结果'}
      description={editingClips ? `编辑后 ${editedClips.length} 个片段，保存后将重新渲染` : `共 ${clips.length} 个片段`}
      actions={
        !editingClips && (projectStatus === 'completed' || projectStatus === 'failed') ? (
          <Button variant="secondary" size="sm" onClick={onStartEdit}>
            <Pencil className="h-3.5 w-3.5" />
            编辑剪辑
          </Button>
        ) : undefined
      }
    >
      {editingClips ? (
        <div className="space-y-3">
          {/* 编辑提示 */}
          <div
            className="flex items-center gap-2 rounded-xl border border-primary-500/20 px-3 py-2 text-xs"
            style={{ background: 'rgba(99, 102, 241, 0.05)', color: 'var(--text-secondary)' }}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-primary-400" />
            可以调整时间、删除不需要的片段、调整片段顺序，保存后将跳过 AI 分析直接重新渲染视频
          </div>

          {/* 编辑中的片段列表 */}
          {editedClips.map((clip, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 rounded-xl border p-3"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
            >
              {/* 序号 + 排序按钮 */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  className="rounded p-0.5 transition-colors hover:bg-white/10 disabled:opacity-30"
                  onClick={() => onMoveUp(idx)}
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                <div
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                    color: 'var(--color-primary)',
                  }}
                >
                  {idx + 1}
                </div>
                <button
                  className="rounded p-0.5 transition-colors hover:bg-white/10 disabled:opacity-30"
                  onClick={() => onMoveDown(idx)}
                  disabled={idx === editedClips.length - 1}
                >
                  <ArrowDown className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>

              {/* 时间编辑 */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5 shrink-0 text-primary-400" />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={clip.startTime}
                      onChange={(e) => onUpdateClip(idx, 'startTime', parseFloat(e.target.value) || 0)}
                      className="w-16 rounded-md border px-2 py-1 text-xs"
                      style={{
                        borderColor: 'var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                      step="0.1"
                      min="0"
                    />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                    <input
                      type="number"
                      value={clip.endTime}
                      onChange={(e) => onUpdateClip(idx, 'endTime', parseFloat(e.target.value) || 0)}
                      className="w-16 rounded-md border px-2 py-1 text-xs"
                      style={{
                        borderColor: 'var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                      step="0.1"
                      min="0"
                    />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      ({Math.round((clip.endTime - clip.startTime) * 10) / 10}秒)
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={clip.reason}
                  onChange={(e) => onUpdateClip(idx, 'reason', e.target.value)}
                  placeholder="剪辑理由（可选）"
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* 删除按钮 */}
              <button
                className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-red-500/10"
                onClick={() => onRemoveClip(idx)}
                title="删除片段"
              >
                <X className="h-4 w-4 text-red-400" />
              </button>
            </motion.div>
          ))}

          {/* 底部操作按钮 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onCancelEdit} disabled={reRendering}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={onReRender}
              loading={reRendering}
              disabled={editedClips.length === 0}
            >
              <Save className="h-3.5 w-3.5" />
              {reRendering ? '重新渲染中...' : '保存并重新渲染'}
            </Button>
          </div>
        </div>
      ) : (
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
      )}
    </Card>
  )
}