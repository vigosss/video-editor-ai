import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Scissors, Brain, Mic, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'

const features = [
  {
    icon: Brain,
    title: '智能分析',
    description: 'AI 深度理解视频内容，自动识别关键片段与精彩瞬间',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Scissors,
    title: '精准剪辑',
    description: '逐帧级别的精确裁剪，智能生成多段短视频素材',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Mic,
    title: '语音转录',
    description: 'Whisper 驱动的语音识别，自动生成精准字幕与时间轴',
    gradient: 'from-cyan-500 to-teal-500',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6"
    >
      {/* Hero 区域 */}
      <section className="flex flex-col items-center text-center">
        {/* Logo + 发光动画 */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="relative mb-8"
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500">
            <Scissors className="h-10 w-10 text-white" />
            {/* 脉冲辉光 */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>

        {/* 标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-4 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-5xl font-bold text-transparent"
        >
          老兵AI智剪
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-10 max-w-md text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          AI 驱动的智能视频剪辑工具
        </motion.p>

        {/* CTA 按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Button
            variant="primary"
            size="lg"
            glow
            onClick={() => navigate('/create')}
            className="group flex items-center gap-2 px-8 py-3 text-base"
          >
            <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
            开始创作
          </Button>
        </motion.div>
      </section>

      {/* Feature 卡片 */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-20 grid w-full grid-cols-3 gap-6"
      >
        {features.map(({ icon: Icon, title, description, gradient }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass-card cursor-default rounded-xl p-6"
          >
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <h3
              className="mb-2 text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {description}
            </p>
          </motion.div>
        ))}
      </motion.section>
    </motion.div>
  )
}
