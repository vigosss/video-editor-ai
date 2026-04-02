import { motion } from 'motion/react'
import { FolderOpen } from 'lucide-react'

export default function Projects() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>项目列表</h2>
      </div>

      {/* 空状态 */}
      <div className="glass-card flex flex-col items-center justify-center py-20">
        <div
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
          }}
        >
          <FolderOpen className="h-10 w-10 text-primary-400" />
        </div>
        <p className="mb-2 text-lg" style={{ color: 'var(--text-secondary)' }}>暂无项目</p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>返回首页创建你的第一个AI剪辑项目</p>
      </div>
    </motion.div>
  )
}