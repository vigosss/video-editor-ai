import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import {
  Key,
  Cpu,
  Mic,
  Film,
  Monitor,
  FolderOpen,
  Save,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import CodeEditor from '@uiw/react-textarea-code-editor'
import { useSettingsStore } from '../stores/settingsStore'
import { useAppStore } from '../stores/appStore'
import type { GLMModel, AnalysisMode, WhisperModelSize, OutputFormat, Resolution } from '@shared/types'
import { MODEL_OPTIONS, ANALYSIS_MODE_OPTIONS, DEFAULT_SYSTEM_PROMPT } from '@shared/constants'

const WHISPER_MODEL_OPTIONS = [
  { value: 'tiny', label: 'Tiny（最快，精度较低）' },
  { value: 'base', label: 'Base（推荐）' },
  { value: 'small', label: 'Small（精度最高）' },
]

const OUTPUT_FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mov', label: 'MOV' },
  { value: 'webm', label: 'WebM' },
]

const RESOLUTION_OPTIONS = [
  { value: '1080p', label: '1080p（Full HD）' },
  { value: '720p', label: '720p（HD）' },
  { value: '480p', label: '480p（SD）' },
  { value: 'original', label: '原始分辨率' },
]

export default function Settings() {
  const { settings, setSettings, fetchSettings } = useSettingsStore()
  const { setTheme } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // 同步远程设置到本地
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  /** 更新本地设置 */
  const updateLocal = <K extends keyof typeof localSettings>(key: K, value: (typeof localSettings)[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  /** 保存所有设置 */
  const handleSave = async () => {
    setSaving(true)
    try {
      await setSettings(localSettings)
      // 同步主题
      if (localSettings.theme) {
        setTheme(localSettings.theme === 'system' ? 'dark' : localSettings.theme)
      }
      toast.success('设置已保存')
    } catch {
      toast.error('保存设置失败')
    } finally {
      setSaving(false)
    }
  }

  /** 选择保存目录 */
  const handleSelectDirectory = async () => {
    try {
      const path = await window.electronAPI.openDirectoryDialog()
      if (path) {
        updateLocal('projectSavePath', path)
      }
    } catch {
      toast.error('选择目录失败')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        设置
      </h2>

      {/* 老兵AI API Key */}
      <Card title="老兵AI API Key" description="用于调用老兵AI 视觉模型 API">
        <div className="flex gap-3">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={localSettings.glmApiKey}
            onChange={(e) => updateLocal('glmApiKey', e.target.value)}
            placeholder="输入你的 老兵AI API Key"
            suffix={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
                className="!h-auto !w-auto !p-0"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            }
            className="flex-1"
            inputClassName="pr-10"
          />
        </div>
      </Card>

      {/* 模型与分析 */}
      <Card title="模型与分析" description="配置默认 AI 模型和分析深度">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="默认 老兵AI 模型"
            value={localSettings.defaultModel}
            onChange={(v) => updateLocal('defaultModel', v as GLMModel)}
            options={MODEL_OPTIONS}
          />
          <Select
            label="默认分析深度"
            value={localSettings.defaultAnalysisMode}
            onChange={(v) => updateLocal('defaultAnalysisMode', v as AnalysisMode)}
            options={ANALYSIS_MODE_OPTIONS}
          />
        </div>
      </Card>

      {/* Whisper 模型 */}
      <Card title="语音识别" description="Whisper 模型用于将视频音频转为字幕">
        <Select
          label="Whisper 模型"
          value={localSettings.whisperModel}
          onChange={(v) => updateLocal('whisperModel', v as WhisperModelSize)}
          options={WHISPER_MODEL_OPTIONS}
        />
      </Card>

      {/* 输出设置 */}
      <Card title="输出设置" description="视频输出格式与分辨率">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="输出格式"
            value={localSettings.outputFormat}
            onChange={(v) => updateLocal('outputFormat', v as OutputFormat)}
            options={OUTPUT_FORMAT_OPTIONS}
          />
          <Select
            label="分辨率"
            value={localSettings.outputResolution}
            onChange={(v) => updateLocal('outputResolution', v as Resolution)}
            options={RESOLUTION_OPTIONS}
          />
        </div>
      </Card>

      {/* 项目保存路径 */}
      <Card title="项目保存路径" description="项目文件和输出视频的保存位置">
        <div className="flex gap-3">
          <Input
            value={localSettings.projectSavePath}
            onChange={(e) => updateLocal('projectSavePath', e.target.value)}
            placeholder="选择项目保存路径"
            className="flex-1"
          />
          <Button variant="secondary" onClick={handleSelectDirectory}>
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* 高级设置：系统提示词 */}
      <Card title="高级设置" description="自定义 老兵AI 分析行为">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          系统提示词
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ⚠️ 请勿删除 JSON 输出格式要求，否则程序无法正确解析 AI 分析结果。
            </p>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <CodeEditor
                value={localSettings.systemPrompt}
                language="markdown"
                onChange={(e) => updateLocal('systemPrompt', e.target.value)}
                placeholder="请输入系统提示词..."
                padding={16}
                style={{
                  fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
                  minHeight: 320,
                  lineHeight: 1.6,
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateLocal('systemPrompt', DEFAULT_SYSTEM_PROMPT)}
              >
                <RotateCcw className="h-3 w-3" />
                恢复默认
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button glow onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          保存设置
        </Button>
      </div>
    </motion.div>
  )
}