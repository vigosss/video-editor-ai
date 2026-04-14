import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'react-toastify'
import clsx from 'clsx'
import {
  Video,
  Plus,
  Trash2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Shuffle,
  List,
  X,
  FolderOpen,
  Upload,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'

// ==========================================
// 类型定义
// ==========================================

type PlayMode = 'sequential' | 'loop' | 'single-loop'

interface PlaylistItem {
  id: string
  name: string
  path: string
  url: string
  duration?: number
}

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg', '3gp']

function isVideoFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return VIDEO_EXTENSIONS.includes(ext)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ==========================================
// 播放模式图标映射
// ==========================================

const playModeConfig: Record<PlayMode, { icon: typeof Repeat; label: string }> = {
  sequential: { icon: Repeat, label: '顺序播放' },
  loop: { icon: Repeat, label: '列表循环' },
  'single-loop': { icon: Repeat1, label: '单曲循环' },
}

// ==========================================
// 主组件
// ==========================================

export default function VideoPlayer() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playMode, setPlayMode] = useState<PlayMode>('sequential')
  const [showPlaylist, setShowPlaylist] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const currentItem = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null

  // ==========================================
  // 添加文件到播放列表
  // ==========================================

  const addFiles = useCallback((filePaths: string[]) => {
    const videoPaths = filePaths.filter((p) => isVideoFile(p))
    if (videoPaths.length === 0) return

    const newItems: PlaylistItem[] = videoPaths.map((p) => {
      const name = p.split(/[\\/]/).pop() || p
      return {
        id: generateId(),
        name,
        path: p,
        url: `local-video://media/${encodeURIComponent(p)}`,
      }
    })

    setPlaylist((prev) => {
      const updated = [...prev, ...newItems]
      // 如果之前没有选中项，自动选中第一个
      if (prev.length === 0) {
        setCurrentIndex(0)
      }
      return updated
    })
  }, [])

  // ==========================================
  // 文件选择对话框
  // ==========================================

  const handleOpenFiles = useCallback(async () => {
    const result = await window.electronAPI.openFilesDialog([
      { name: '视频文件', extensions: VIDEO_EXTENSIONS },
    ])
    if (result && result.length > 0) {
      addFiles(result)
    }
  }, [addFiles])

  // ==========================================
  // 隐藏文件输入（拖拽/点击备用）
  // ==========================================

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      const paths = Array.from(files).map((f) => f.path)
      addFiles(paths)
      // 重置 input 值以便重复选择同一文件
      e.target.value = ''
    },
    [addFiles],
  )

  // ==========================================
  // 拖拽事件处理
  // ==========================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length === 0) return
      const paths = Array.from(files).map((f) => f.path)
      addFiles(paths)
    },
    [addFiles],
  )

  // ==========================================
  // 播放控制
  // ==========================================

  const playItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= playlist.length) return
      setCurrentIndex(index)
      setIsPlaying(true)
    },
    [playlist.length],
  )

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  const playNext = useCallback(() => {
    if (playlist.length === 0) return
    if (playMode === 'single-loop') {
      // 单曲循环：重新播放当前
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        video.play()
      }
      return
    }
    const next = (currentIndex + 1) % playlist.length
    if (next === 0 && playMode === 'sequential') {
      // 顺序播放到末尾就停止
      setIsPlaying(false)
      return
    }
    playItem(next)
  }, [playlist.length, currentIndex, playMode, playItem])

  const playPrev = useCallback(() => {
    if (playlist.length === 0) return
    const prev = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1
    playItem(prev)
  }, [playlist.length, currentIndex, playItem])

  const togglePlayMode = useCallback(() => {
    setPlayMode((prev) => {
      const modes: PlayMode[] = ['sequential', 'loop', 'single-loop']
      const idx = modes.indexOf(prev)
      return modes[(idx + 1) % modes.length]
    })
  }, [])

  // ==========================================
  // 删除 / 清空
  // ==========================================

  const removeItem = useCallback(
    (id: string) => {
      setPlaylist((prev) => {
        const idx = prev.findIndex((item) => item.id === id)
        const updated = prev.filter((item) => item.id !== id)
        if (updated.length === 0) {
          setCurrentIndex(-1)
          setIsPlaying(false)
        } else if (idx === currentIndex) {
          // 删的是正在播放的 → 播放下一个
          const nextIdx = Math.min(idx, updated.length - 1)
          setCurrentIndex(nextIdx)
        } else if (idx < currentIndex) {
          setCurrentIndex((prev) => prev - 1)
        }
        return updated
      })
    },
    [currentIndex],
  )

  const clearPlaylist = useCallback(() => {
    setPlaylist([])
    setCurrentIndex(-1)
    setIsPlaying(false)
  }, [])

  // ==========================================
  // Video 事件
  // ==========================================

  const handleVideoEnded = useCallback(() => {
    playNext()
  }, [playNext])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setDuration(video.duration)
      // 更新播放列表中当前项的时长
      setPlaylist((prev) =>
        prev.map((item, i) =>
          i === currentIndex ? { ...item, duration: video.duration } : item,
        ),
      )
    }
  }, [currentIndex])

  /** 视频加载失败处理 */
  const handleVideoError = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentItem) return
    const mediaError = video.error
    const msg = mediaError
      ? `视频加载失败 (错误码: ${mediaError.code})`
      : '视频加载失败'
    toast.error(`${currentItem.name}: ${msg}`)
    console.error('[VideoPlayer] 加载失败:', currentItem.path, mediaError)
  }, [currentItem])

  // 当 currentIndex 变化时自动播放
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentIndex < 0) return
    video.load()
    if (isPlaying) {
      video.play().catch(() => {})
    }
  }, [currentIndex, playlist]) // eslint-disable-line react-hooks/exhaustive-deps

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在输入框中，忽略
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) videoRef.current.currentTime -= 5
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) videoRef.current.currentTime += 5
          break
        case 'ArrowUp':
          e.preventDefault()
          if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay])

  // ==========================================
  // 渲染
  // ==========================================

  const PlayModeIcon = playModeConfig[playMode].icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col gap-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={VIDEO_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 拖拽覆盖层 */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(99, 102, 241, 0.1)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary-400 px-16 py-12"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--color-primary)' }}
            >
              <Upload className="h-16 w-16 text-primary-400" />
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                松开以添加视频
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                支持 MOV、MP4、AVI、MKV、WebM 等格式
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
            }}
          >
            <Video className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              视频播放
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              支持拖拽添加 · 多格式播放
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleOpenFiles}>
            <FolderOpen className="h-4 w-4" />
            选择文件
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Plus className="h-4 w-4" />
            添加
          </Button>
          {playlist.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearPlaylist}>
              <Trash2 className="h-4 w-4" />
              清空
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaylist((prev) => !prev)}
          >
            <List className="h-4 w-4" />
            {showPlaylist ? '隐藏列表' : '显示列表'}
          </Button>
        </div>
      </div>

      {/* 主体区域：播放器 + 播放列表 */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* 视频播放器 */}
        <div className="flex flex-1 flex-col gap-3">
          {/* 视频画面 */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: '#000' }}
          >
            {currentItem ? (
              <video
                ref={videoRef}
                key={currentItem.id}
                src={currentItem.url}
                className="h-full w-full"
                controls={false}
                onEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
              />
            ) : (
              /* 空状态 */
              <div
                className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed px-16 py-12 cursor-pointer"
                style={{
                  borderColor: isDragOver ? 'var(--color-primary)' : 'var(--border-color)',
                  background: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <motion.div
                  animate={isDragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                  }}
                >
                  <Video className="h-10 w-10 text-primary-400" />
                </motion.div>
                <div className="text-center">
                  <p className="mb-2 text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                    拖拽视频文件到此处
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    或点击此处选择文件
                  </p>
                  <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    支持 MOV、MP4、AVI、MKV、WebM、FLV 等格式
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 自定义控制栏 */}
          {currentItem && (
            <div className="glass-card rounded-xl px-4 py-3">
              {/* 进度条 */}
              <div className="group mb-3 flex items-center gap-3">
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDuration(currentTime)}
                </span>
                <div
                  className="relative h-1.5 flex-1 cursor-pointer rounded-full transition-all group-hover:h-2.5"
                  style={{ background: 'var(--bg-tertiary)' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const ratio = (e.clientX - rect.left) / rect.width
                    if (videoRef.current) {
                      videoRef.current.currentTime = ratio * duration
                    }
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{
                      width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                      background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDuration(duration)}
                </span>
              </div>

              {/* 控制按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={playPrev} className="!p-1.5">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={togglePlay}
                    className="!h-9 !w-9 !rounded-full !p-0"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={playNext} className="!p-1.5">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {/* 当前播放文件名 */}
                  <p
                    className="max-w-xs truncate text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {currentItem.name}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {/* 播放模式 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlayMode}
                    className={clsx('!p-1.5 gap-1')}
                    title={playModeConfig[playMode].label}
                  >
                    <PlayModeIcon
                      className={clsx(
                        'h-4 w-4',
                        playMode !== 'sequential' ? 'text-primary-400' : '',
                      )}
                    />
                  </Button>
                  {/* 播放列表数量 */}
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                    {currentIndex + 1}/{playlist.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 播放列表侧栏 */}
        <AnimatePresence>
          {showPlaylist && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex h-full flex-col overflow-hidden rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              {/* 列表头部 */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    播放列表
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {playlist.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlaylist(false)}
                  className="!p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 列表内容 */}
              <div className="flex-1 overflow-y-auto">
                {playlist.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
                    <Video
                      className="h-8 w-8"
                      style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}
                    />
                    <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      暂无视频
                      <br />
                      拖拽或点击添加
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col p-2">
                    {playlist.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className={clsx(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200',
                        )}
                        style={{
                          background:
                            index === currentIndex
                              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
                              : 'transparent',
                          border:
                            index === currentIndex
                              ? '1px solid var(--border-active)'
                              : '1px solid transparent',
                        }}
                        onClick={() => playItem(index)}
                      >
                        {/* 序号 / 播放指示 */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                          {index === currentIndex && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <motion.div
                                animate={{ height: ['30%', '100%', '30%'] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-0.5 rounded-full bg-primary-400"
                              />
                              <motion.div
                                animate={{ height: ['60%', '30%', '60%'] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                                className="w-0.5 rounded-full bg-primary-400"
                              />
                              <motion.div
                                animate={{ height: ['40%', '90%', '40%'] }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                                className="w-0.5 rounded-full bg-primary-400"
                              />
                            </div>
                          ) : (
                            <span
                              className="text-xs tabular-nums"
                              style={{
                                color:
                                  index === currentIndex
                                    ? 'var(--color-primary)'
                                    : 'var(--text-tertiary)',
                              }}
                            >
                              {index + 1}
                            </span>
                          )}
                        </div>

                        {/* 文件信息 */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={clsx(
                              'truncate text-sm',
                              index === currentIndex ? 'font-medium' : '',
                            )}
                            style={{
                              color:
                                index === currentIndex
                                  ? 'var(--text-primary)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {item.name}
                          </p>
                          {item.duration != null && (
                            <p className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                              {formatDuration(item.duration)}
                            </p>
                          )}
                        </div>

                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeItem(item.id)
                          }}
                          className="shrink-0 rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--bg-tertiary)]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* 列表底部：添加更多 */}
              <div
                className="px-3 py-3"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleOpenFiles}
                >
                  <Plus className="h-4 w-4" />
                  添加更多视频
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}