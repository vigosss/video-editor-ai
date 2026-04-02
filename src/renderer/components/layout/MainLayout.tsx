import { Outlet } from 'react-router-dom'
import { motion } from 'motion/react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '../../stores/appStore'

export function MainLayout() {
  const { theme } = useAppStore()

  return (
    <div className={`${theme} relative flex h-screen flex-col overflow-hidden`}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* 科技感背景层 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 网格图案 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* 顶部辉光 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'var(--overlay-gradient)',
          }}
        />

        {/* 浮动光球 - 左上 */}
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)',
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* 浮动光球 - 右下 */}
        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)',
          }}
          animate={{
            x: [0, -20, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* 浮动光球 - 中间偏右 */}
        <motion.div
          className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1), transparent 70%)',
          }}
          animate={{
            x: [0, 15, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* 顶部标题栏（横跨全宽） */}
      <Header />

      {/* 下方：侧边栏 + 主内容区 */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}