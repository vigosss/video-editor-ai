import { motion } from 'motion/react'
import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="glass-card flex flex-col items-center justify-center py-20">
        <div
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
          }}
        >
          <SettingsIcon className="h-10 w-10 text-primary-400" />
        </div>
        <p className="mb-2 text-lg" style={{ color: 'var(--text-secondary)' }}>设置</p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>配置 API Key、模型、输出格式等</p>
      </div>
    </motion.div>
  )
}