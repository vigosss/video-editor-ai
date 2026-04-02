import { motion } from 'motion/react'
import { Scissors, Github, Heart } from 'lucide-react'

export default function About() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="glass-card mx-auto max-w-lg p-8 text-center">
        {/* Logo */}
        <div className="relative mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500">
          <Scissors className="h-10 w-10 text-white" />
          {/* Logo 辉光 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 opacity-40 blur-xl" />
        </div>

        <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>老兵AI智剪</h2>
        <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>v0.1.0</p>

        <p className="mb-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          一款 AI 驱动的智能视频剪辑桌面应用。
          <br />
          上传视频，输入需求，AI 自动分析并剪辑，一键发布到短视频平台。
        </p>

        <div className="flex items-center justify-center gap-6" style={{ color: 'var(--text-tertiary)' }}>
          <div className="flex items-center gap-1.5 text-sm">
            <Heart className="h-4 w-4 text-primary-400" />
            <span>智谱 GLM 视觉模型驱动</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Github className="h-4 w-4 text-accent-400" />
            <span>开源项目</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}