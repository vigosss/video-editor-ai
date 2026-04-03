import { useState, useCallback } from 'react'
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
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useSettingsStore } from '../stores/settingsStore'
import type { GLMModel, AnalysisMode } from '@shared/types'
import { MODEL_OPTIONS, ANALYSIS_MODE_OPTIONS } from '@shared/constants'

/** Prompt 模板 */
const PROMPT_TEMPLATES = [
  { label: '🔥 精彩片段集锦', value: '帮我找出视频中所有精彩片段，每个片段不超过30秒，适合发布到短视频平台' },
  { label: '✂️ 去除冗余', value: '帮我去除视频中所有冗余、重复、无意义的片段，保留核心内容' },
  { label: '🎯 高光时刻', value: '找出视频中最吸引人的高光时刻，每个片段15-60秒' },
  { label: '📝 知识要点', value: '提取视频中所有知识点和重要信息，按时间顺序整理' },
]

export default function Home() {
  const navigate = useNavigate()
  const { settings } = useSettingsStore()

  // 表单状态
  const [videoPath, setVideoPath] = useState('')
  const [videoName, setVideoName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<GLMModel>(settings.defaultModel)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(settings.defaultAnalysisMode)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  /** 选择视频文件 */
  const handleSelectFile = useCallback(async () => {
    try {
      const path = await window.electronAPI.openFileDialog([
        { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'] },
      ])
      if (path) {
        setVideoPath(path)
        setVideoName(path.split('/').pop() || path.split('\\').pop() || path)
      }
    } catch {
      toast.error('选择文件失败')
    }
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
  const handleSelectTemplate = (tpl: (typeof PROMPT_TEMPLATES)[number]) => {
    setPrompt(tpl.value)
    setShowTemplates(false)
  }

  /** 清除已选视频 */
  const handleClearVideo = () => {
    setVideoPath('')
    setVideoName('')
  }

  /** 创建项目并开始处理 */
  const handleStart = async () => {
    if (!videoPath) {
      toast.warning('请先选择视频文件')
      return
    }
    if (!prompt.trim()) {
      toast.warning('请输入剪辑需求描述')
      return
    }

    setCreating(true)
    try {
      const projectName = videoName.replace(/\.[^.]+$/, '') || '未命名项目'
      const project = await window.electronAPI.createProject({
        name: projectName,
        videoPath,
        outputPath: settings.projectSavePath || '',
        prompt: prompt.trim(),
        model,
        analysisMode,
      })

      toast.success('项目创建成功！')

      // 尝试启动处理（阶段七实现，目前会抛错，跳转到详情页即可）
      try {
        await window.electronAPI.startProcess(project.id)
      } catch {
        // 处理流程尚未实现，忽略
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
        <h1 className="mb-3 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          欢迎使用{' '}
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            老兵AI智剪
          </span>
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
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
        <div className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <FileVideo className="mr-1.5 inline h-4 w-4 text-primary-400" />
          视频文件
        </div>

        {videoPath ? (
          /* 已选择视频 */
          <div
            className="flex items-center gap-4 rounded-xl border p-4"
            style={{
              borderColor: 'var(--border-active)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
            }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))' }}
            >
              <FileVideo className="h-6 w-6 text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                {videoName}
              </p>
              <p className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {videoPath}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearVideo} className="shrink-0">
              <X className="h-4 w-4" />
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
              borderColor: isDragging ? 'var(--color-primary)' : 'var(--border-color)',
              background: isDragging
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))'
                : 'transparent',
            }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
              }}
            >
              <Upload className="h-7 w-7 text-primary-400" />
            </div>
            <p className="mb-2 text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              拖拽视频文件到此处
            </p>
            <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              或点击下方按钮选择文件（支持 MP4、MOV、AVI、MKV）
            </p>
            <Button variant="secondary" size="sm" onClick={handleSelectFile}>
              <Upload className="h-4 w-4" />
              选择视频文件
            </Button>
          </div>
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
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Wand2 className="mr-1.5 inline h-4 w-4 text-primary-400" />
            剪辑需求描述
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            快速模板
            <ChevronDown className={`h-3 w-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* 模板列表 */}
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex flex-wrap gap-2"
          >
            {PROMPT_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.label}
                variant="secondary"
                size="sm"
                onClick={() => handleSelectTemplate(tpl)}
              >
                {tpl.label}
              </Button>
            ))}
          </motion.div>
        )}

        <textarea
          className="input-glow w-full resize-none"
          rows={4}
          placeholder="描述你对视频的剪辑需求，例如：帮我找出视频中所有精彩片段，每个片段不超过30秒..."
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
          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Settings2 className="h-4 w-4 text-primary-400" />
            高级配置
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showConfig ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </Button>

        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
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
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary-400" />
            {MODEL_OPTIONS.find((m) => m.value === model)?.label}
          </span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span className="flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-accent-400" />
            {ANALYSIS_MODE_OPTIONS.find((m) => m.value === analysisMode)?.label}模式
          </span>
        </div>
        <Button glow size="lg" onClick={handleStart} loading={creating} disabled={!videoPath || !prompt.trim()}>
          <Sparkles className="h-5 w-5" />
          开始分析并剪辑
        </Button>
      </motion.div>
    </div>
  )
}