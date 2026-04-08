import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import {
  Upload,
  Sparkles,
  Zap,
  Film,
  Wand2,
  FileVideo,
  X,
  ChevronDown,
  Settings2,
  Plus,
  Trash2,
  FileText,
  Subtitles,
  Music,
  Shuffle,
  Volume2,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useSettingsStore } from '../stores/settingsStore'
import type { GLMModel, AnalysisMode, PromptTemplate, AudioMode, TransitionType, BeatSyncMode, BGMTrack } from '@shared/types'
import { MODEL_OPTIONS, ANALYSIS_MODE_OPTIONS, AUDIO_MODE_OPTIONS, BEAT_SYNC_MODE_OPTIONS, TRANSITION_TYPE_OPTIONS } from '@shared/constants'


export default function Create() {
  const navigate = useNavigate()
  const { settings } = useSettingsStore()

  // 表单状态
  const [videoPaths, setVideoPaths] = useState<string[]>([])
  const [projectNameInput, setProjectNameInput] = useState('')
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<GLMModel>(settings.defaultModel)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(settings.defaultAnalysisMode)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [needsSubtitles, setNeedsSubtitles] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // BGM 相关状态
  const [showBgmOptions, setShowBgmOptions] = useState(false)
  const [bgmTracks, setBgmTracks] = useState<BGMTrack[]>([])
  const [selectedBgmTrackId, setSelectedBgmTrackId] = useState<string | null>(null)
  const [audioMode, setAudioMode] = useState<AudioMode>('mixed')
  const [bgmVolume, setBgmVolume] = useState(30)
  const [originalAudioVolume, setOriginalAudioVolume] = useState(100)
  const [beatSyncMode, setBeatSyncMode] = useState<BeatSyncMode>('none')
  const [transitionType, setTransitionType] = useState<TransitionType>('none')
  const [transitionDuration, setTransitionDuration] = useState(0.5)

  // 模板数据
  const [templates, setTemplates] = useState<PromptTemplate[]>([])

  /** 加载模板列表 */
  useEffect(() => {
    window.electronAPI.listTemplates().then(setTemplates).catch(() => {
      // 静默处理，不影响用户操作
    })
  }, [])

  /** 加载 BGM 曲目列表 */
  useEffect(() => {
    window.electronAPI.listBgmTracks().then(setBgmTracks).catch(() => {
      // 静默处理
    })
  }, [])

  /** 获取文件名 */
  const getFileName = (path: string) => path.split('\\').pop()?.split('/').pop() || path

  /** 选择视频文件（多选） */
  const handleSelectFiles = useCallback(async () => {
    try {
      const paths = await window.electronAPI.openFilesDialog([
        { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'] },
      ])
      if (paths && paths.length > 0) {
        setVideoPaths(prev => {
          const set = new Set([...prev, ...paths])
          return Array.from(set)
        })
      }
    } catch {
      toast.error('选择文件失败')
    }
  }, [])

  /** 移除单个视频 */
  const handleRemoveVideo = useCallback((index: number) => {
    setVideoPaths(prev => prev.filter((_, i) => i !== index))
  }, [])

  /** 清除所有视频 */
  const handleClearVideos = useCallback(() => {
    setVideoPaths([])
  }, [])

  /** 拖拽事件 */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    toast.info('由于安全限制，请使用"选择视频文件"按钮选择视频')
  }, [])

  /** 选择模板 */
  const handleSelectTemplate = (tpl: PromptTemplate) => {
    setPrompt(tpl.content)
    setShowTemplates(false)
  }

  /** 随机选择 BGM */
  const handleRandomBgm = () => {
    if (bgmTracks.length === 0) return
    const available = bgmTracks.filter(t => t.id !== selectedBgmTrackId)
    if (available.length === 0) return
    const random = available[Math.floor(Math.random() * available.length)]
    setSelectedBgmTrackId(random.id)
  }

  /** 创建项目并开始处理 */
  const handleStart = async () => {
    if (videoPaths.length === 0) {
      toast.warning('请先选择视频文件')
      return
    }
    if (!prompt.trim()) {
      toast.warning('请输入剪辑需求描述')
      return
    }

    // 检查 Whisper 模型是否已下载（仅需要字幕时检查）
    if (needsSubtitles) {
      const models = await window.electronAPI.whisperGetModels()
      const current = models.find((m) => m.size === settings.whisperModel)
      if (!current?.downloaded) {
        toast.warning(`Whisper ${settings.whisperModel} 模型未下载，请先前往设置页下载模型`)
        return
      }
    }

    setCreating(true)
    try {
      const firstVideoName = getFileName(videoPaths[0]).replace(/\.[^.]+$/, '') || '未命名项目'
      const autoName = videoPaths.length > 1
        ? `${firstVideoName} 等${videoPaths.length}个视频`
        : firstVideoName
      const projectName = projectNameInput.trim() || autoName

      const project = await window.electronAPI.createProject({
        name: projectName,
        videoPaths,
        outputPath: settings.projectSavePath || '',
        prompt: prompt.trim(),
        model,
        analysisMode,
        needsSubtitles,
        bgmTrackId: showBgmOptions ? selectedBgmTrackId : null,
        audioMode: showBgmOptions ? audioMode : 'original',
        bgmVolume: bgmVolume / 100,
        originalAudioVolume: originalAudioVolume / 100,
        transitionType: showBgmOptions ? transitionType : 'none',
        transitionDuration,
        beatSyncMode: showBgmOptions ? beatSyncMode : 'none',
      })

      toast.success('项目创建成功，正在启动处理...')

      // 启动处理流程
      try {
        await window.electronAPI.startProcess(project.id)
      } catch (err) {
        // 处理启动失败（如 API Key 未配置等），仍然跳转到详情页
        const msg = err instanceof Error ? err.message : '启动处理失败'
        toast.warning(`处理启动失败: ${msg}，可在项目详情页重试`)
      }

      navigate(`/projects/${project.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建项目失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 欢迎区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <h1
          className="mb-3 text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          欢迎使用{" "}
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            老兵AI智剪
          </span>
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          上传视频，输入需求，AI 自动分析并剪辑，一键发布到短视频平台
        </p>
      </motion.div>

      {/* 视频上传区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card mb-6 p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <FileVideo className="mr-1.5 inline h-4 w-4 text-primary-400" />
            视频文件
          </span>
          {videoPaths.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearVideos}>
              <Trash2 className="h-3.5 w-3.5" />
              清除全部
            </Button>
          )}
        </div>

        {videoPaths.length > 0 ? (
          /* 已选择视频列表 */
          <div className="space-y-2">
            {videoPaths.map((path, index) => (
              <div
                key={path}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{
                  borderColor: "var(--border-active)",
                  background:
                    "linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(139, 92, 246, 0.03))",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))",
                    color: "var(--color-primary)",
                  }}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {getFileName(path)}
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {path}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveVideo(index)}
                  className="shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {/* 追加选择按钮 */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSelectFiles}
              className="w-full"
            >
              <Plus className="h-4 w-4" />
              继续添加视频（已选 {videoPaths.length} 个）
            </Button>
          </div>
        ) : (
          /* 未选择视频 - 拖拽区 */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-all duration-300"
            style={{
              borderColor: isDragging
                ? "var(--color-primary)"
                : "var(--border-color)",
              background: isDragging
                ? "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))"
                : "transparent",
            }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))",
              }}
            >
              <Upload className="h-7 w-7 text-primary-400" />
            </div>
            <p
              className="mb-2 text-base font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              拖拽视频文件到此处
            </p>
            <p
              className="mb-4 text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              或点击下方按钮选择文件（支持多选，MP4、MOV、AVI、MKV）
            </p>
            <Button variant="secondary" size="sm" onClick={handleSelectFiles}>
              <Upload className="h-4 w-4" />
              选择视频文件
            </Button>
          </div>
        )}
      </motion.div>

      {/* 项目名称输入区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="glass-card mb-6 p-6"
      >
        <div className="mb-3">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <FileText className="mr-1.5 inline h-4 w-4 text-primary-400" />
            项目名称
          </span>
        </div>
        <input
          type="text"
          className="input-glow w-full"
          placeholder="请输入项目名称（留空则默认使用视频文件名）"
          value={projectNameInput}
          onChange={(e) => setProjectNameInput(e.target.value)}
        />
      </motion.div>

      {/* 字幕选项 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="glass-card mb-6 p-6"
      >
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative flex h-5 w-9 shrink-0">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={needsSubtitles}
              onChange={(e) => setNeedsSubtitles(e.target.checked)}
            />
            <div
              className="h-5 w-9 rounded-full transition-colors duration-200"
              style={{ background: needsSubtitles ? 'var(--color-primary)' : 'var(--border-active)' }}
            />
            <div
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${needsSubtitles ? 'translate-x-4' : ''}`}
            />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Subtitles className="mr-1.5 inline h-4 w-4 text-primary-400" />
            需要字幕
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            开启后将通过语音转录生成字幕并嵌入视频
          </span>
        </label>
      </motion.div>

      {/* 背景音乐 & 节拍同步 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.19 }}
        className="glass-card mb-6 p-6"
      >
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative flex h-5 w-9 shrink-0">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={showBgmOptions}
              onChange={(e) => setShowBgmOptions(e.target.checked)}
            />
            <div
              className="h-5 w-9 rounded-full transition-colors duration-200"
              style={{ background: showBgmOptions ? 'var(--color-primary)' : 'var(--border-active)' }}
            />
            <div
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${showBgmOptions ? 'translate-x-4' : ''}`}
            />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Music className="mr-1.5 inline h-4 w-4 text-primary-400" />
            背景音乐
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            添加背景音乐，支持节拍卡点和转场效果
          </span>
        </label>

        {showBgmOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 space-y-4"
          >
            {/* BGM 曲目选择 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                  选择背景音乐
                </span>
                <Button variant="ghost" size="sm" onClick={handleRandomBgm} disabled={bgmTracks.length === 0}>
                  <Shuffle className="h-3 w-3" />
                  随机选择
                </Button>
              </div>
              {bgmTracks.length === 0 ? (
                <div
                  className="rounded-lg border p-4 text-center text-xs"
                  style={{ color: "var(--text-tertiary)", borderColor: "var(--border-color)" }}
                >
                  暂无背景音乐，请在应用资源目录中添加 BGM 文件
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                  {bgmTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setSelectedBgmTrackId(track.id === selectedBgmTrackId ? null : track.id)}
                      className="shrink-0 rounded-lg border px-3 py-2 text-left transition-all duration-200"
                      style={{
                        borderColor: track.id === selectedBgmTrackId ? 'var(--color-primary)' : 'var(--border-color)',
                        background: track.id === selectedBgmTrackId
                          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))'
                          : 'transparent',
                      }}
                    >
                      <p className="text-xs font-medium truncate max-w-[120px]" style={{ color: "var(--text-primary)" }}>
                        {track.name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')} · {track.bpm} BPM
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 音频模式 + 节拍同步 */}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="音频模式"
                value={audioMode}
                onChange={(v) => setAudioMode(v as AudioMode)}
                options={AUDIO_MODE_OPTIONS}
              />
              <Select
                label="节拍同步"
                value={beatSyncMode}
                onChange={(v) => setBeatSyncMode(v as BeatSyncMode)}
                options={BEAT_SYNC_MODE_OPTIONS}
              />
            </div>

            {/* 音量控制（混合模式时显示） */}
            {audioMode === 'mixed' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>BGM 音量 {bgmVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>原声音量 {originalAudioVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={originalAudioVolume}
                    onChange={(e) => setOriginalAudioVolume(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                </div>
              </div>
            )}

            {/* 转场效果 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Select
                  label="转场效果"
                  value={transitionType}
                  onChange={(v) => setTransitionType(v as TransitionType)}
                  options={TRANSITION_TYPE_OPTIONS}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "var(--text-tertiary)" }}>
                  转场时长（秒）
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={transitionDuration}
                  onChange={(e) => setTransitionDuration(Number(e.target.value))}
                  className="input-glow w-full text-sm"
                  disabled={transitionType === 'none'}
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Prompt 输入区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card mb-6 p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Wand2 className="mr-1.5 inline h-4 w-4 text-primary-400" />
            剪辑需求描述
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            选择模板
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showTemplates ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {/* 模板列表 */}
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex flex-wrap gap-2"
          >
            {templates.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                暂无模板，请先在「模板管理」中创建
              </p>
            ) : (
              templates.map((tpl) => (
                <Button
                  key={tpl.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSelectTemplate(tpl)}
                >
                  {tpl.name}
                </Button>
              ))
            )}
          </motion.div>
        )}

        <textarea
          className="input-glow w-full resize-none"
          rows={4}
          placeholder={`描述你对视频的剪辑需求，例如：
1. 提取视频中最精彩的高光时刻，总时长控制在3分钟以内
2. 先外观后内饰，按顺序提取相关片段
3. 剪辑出节奏感最强的片段，适合做短视频`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </motion.div>

      {/* 配置选项 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card mb-6 p-6"
      >
        <Button
          variant="ghost"
          onClick={() => setShowConfig(!showConfig)}
          className="w-full !justify-between"
        >
          <span
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Settings2 className="h-4 w-4 text-primary-400" />
            高级配置
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showConfig ? "rotate-180" : ""}`}
            style={{ color: "var(--text-tertiary)" }}
          />
        </Button>

        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 grid grid-cols-2 gap-4"
          >
            <Select
              label="AI 模型"
              value={model}
              onChange={(v) => setModel(v as GLMModel)}
              options={MODEL_OPTIONS}
            />
            <Select
              label="分析模式"
              value={analysisMode}
              onChange={(v) => setAnalysisMode(v as AnalysisMode)}
              options={ANALYSIS_MODE_OPTIONS}
            />
          </motion.div>
        )}
      </motion.div>

      {/* 底部：快速信息 + 开始按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center justify-between"
      >
        <div
          className="flex items-center gap-4 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary-400" />
            {MODEL_OPTIONS.find((m) => m.value === model)?.label}
          </span>
          <span style={{ color: "var(--border-color)" }}>|</span>
          <span className="flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-accent-400" />
            {ANALYSIS_MODE_OPTIONS.find((m) => m.value === analysisMode)?.label}
            模式
          </span>
          {showBgmOptions && selectedBgmTrackId && (
            <>
              <span style={{ color: "var(--border-color)" }}>|</span>
              <span className="flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-primary-400" />
                {bgmTracks.find((t) => t.id === selectedBgmTrackId)?.name || 'BGM'}
              </span>
            </>
          )}
        </div>
        <Button
          glow
          size="lg"
          onClick={handleStart}
          loading={creating}
          disabled={videoPaths.length === 0 || !prompt.trim()}
        >
          <Sparkles className="h-5 w-5" />
          开始分析并剪辑
        </Button>
      </motion.div>
    </div>
  );
}
