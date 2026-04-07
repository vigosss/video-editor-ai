import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import {
  Home,
  FolderOpen,
  Settings,
  Scissors,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/projects', icon: FolderOpen, label: '项目列表' },
  { to: '/templates', icon: LayoutTemplate, label: '模板管理' },
  { to: '/settings', icon: Settings, label: '设置' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex h-full flex-col border-r backdrop-blur-xl"
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* 顶部渐变光线 */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--color-primary), var(--color-accent), transparent)',
          opacity: 0.5,
        }}
      />

      {/* Logo 区域 */}
      <div
        className={clsx(
          'relative flex items-center px-4',
          sidebarCollapsed ? 'h-16 justify-center' : 'h-16 gap-3',
        )}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500">
          <Scissors className="h-5 w-5 text-white" />
          {/* Logo 辉光 */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 opacity-50 blur-md" />
        </div>
        {!sidebarCollapsed ? (
          <>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-lg font-bold text-transparent"
            >
              老兵AI智剪
            </motion.span>
            <div className="ml-auto">
              <Button
                variant="ghost"
                onClick={toggleSidebar}
                className="h-7 w-7 rounded-lg !p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="ghost"
            onClick={toggleSidebar}
            className="h-7 w-7 rounded-lg !p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 导航列表 */}
      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* 活跃背景 */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                      border: '1px solid var(--border-active)',
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon
                  className={clsx(
                    'relative h-5 w-5 shrink-0 transition-colors duration-200',
                    isActive
                      ? 'text-primary-400'
                      : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]',
                  )}
                />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative"
                  >
                    {label}
                  </motion.span>
                )}
                {/* 活跃指示点 */}
                {isActive && (
                  <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-400 shadow-glow-sm" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 底部装饰线 */}
      <div className="px-4 pb-4">
        <div
          className="h-px w-full"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)',
          }}
        />
      </div>
    </motion.aside>
  )
}