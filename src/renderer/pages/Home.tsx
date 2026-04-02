import { motion } from 'motion/react'
import { Upload, Sparkles, Zap, Film, Wand2 } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function Home() {
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
        className="glass-card mb-6 p-8"
      >
        <div
          className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 transition-all duration-300"
          style={{
            borderColor: 'var(--border-color)',
          }}
        >
          {/* 悬浮时渐变边框效果 */}
          <div
            className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              borderImage: 'linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.5)) 1',
            }}
          />
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
            }}
          >
            <Upload className="h-8 w-8 text-primary-400" />
          </div>
          <p className="mb-2 text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            拖拽视频文件到此处
          </p>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            或点击选择文件（支持 MP4、MOV、AVI）
          </p>
          <Button variant="secondary" size="sm">
            选择视频文件
          </Button>
        </div>
      </motion.div>

      {/* Prompt 输入区 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card mb-6 p-6"
      >
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          <Wand2 className="mr-1.5 inline h-4 w-4 text-primary-400" />
          剪辑需求描述
        </label>
        <textarea
          className="input-glow w-full resize-none"
          rows={4}
          placeholder="描述你对视频的剪辑需求，例如：帮我找出视频中所有精彩片段，每个片段不超过30秒..."
        />
      </motion.div>

      {/* 配置选项 + 开始按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary-400" />
            模型：GLM-4.6V-FlashX
          </span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span className="flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-accent-400" />
            分析模式：标准
          </span>
        </div>
        <Button glow size="lg">
          <Sparkles className="h-5 w-5" />
          开始分析并剪辑
        </Button>
      </motion.div>
    </div>
  )
}