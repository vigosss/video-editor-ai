import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useAppStore } from '../../stores/appStore'

interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  group?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = '请选择',
  className,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selectedOption = options.find((o) => o.value === value)
  const { theme } = useAppStore()

  /** 计算下拉菜单位置 */
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const maxDropdownHeight = 240 // max-h-60 = 15rem = 240px
    const spaceBelow = viewportHeight - rect.bottom - 4
    const spaceAbove = rect.top - 4

    if (spaceBelow >= maxDropdownHeight || spaceBelow >= spaceAbove) {
      // 下方空间足够，或者下方比上方大，放下方
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: Math.min(maxDropdownHeight, spaceBelow),
      })
    } else {
      // 下方空间不足，翻转向上
      setDropdownStyle({
        position: 'fixed',
        bottom: viewportHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: Math.min(maxDropdownHeight, spaceAbove),
      })
    }
  }, [])

  // 打开时计算位置，并监听滚动/resize
  useEffect(() => {
    if (!open) return
    updatePosition()

    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('[data-select-dropdown]')
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={clsx('flex flex-col gap-1.5', className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={clsx(
            'input-glow flex w-full items-center justify-between text-left',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span className="flex items-center gap-2">
            {selectedOption?.icon}
            {selectedOption ? (
              <span style={{ color: 'var(--text-primary)' }}>{selectedOption.label}</span>
            ) : (
              <span style={{ color: 'var(--text-tertiary)' }}>{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={clsx(
              'h-4 w-4 transition-transform duration-200',
              open && 'rotate-180',
            )}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>

        {createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className={theme}
                data-select-dropdown
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  ...dropdownStyle,
                  overflow: 'auto',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  boxShadow: 'var(--glow-primary)',
                }}
              >
                <div className="overflow-y-auto py-1">
                  {(() => {
                    // 检查是否有分组选项
                    const hasGroups = options.some((o) => o.group)
                    if (!hasGroups) {
                      // 无分组，直接渲染
                      return options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onChange(option.value)
                            setOpen(false)
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-150',
                          )}
                          style={{
                            color: option.value === value ? 'var(--color-primary)' : 'var(--text-primary)',
                            background:
                              option.value === value
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))'
                                : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (option.value !== value) {
                              e.currentTarget.style.background = 'var(--bg-tertiary)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (option.value !== value) {
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                        >
                          {option.icon}
                          {option.label}
                        </button>
                      ))
                    }

                    // 按分组渲染
                    const elements: ReactNode[] = []
                    let lastGroup = ''
                    for (const option of options) {
                      if (option.group && option.group !== lastGroup) {
                        lastGroup = option.group
                        elements.push(
                          <div
                            key={`group-${option.group}`}
                            className="px-3 pt-2 pb-1 text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {option.group}
                          </div>,
                        )
                      }
                      elements.push(
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onChange(option.value)
                            setOpen(false)
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-150',
                          )}
                          style={{
                            color: option.value === value ? 'var(--color-primary)' : 'var(--text-primary)',
                            background:
                              option.value === value
                                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))'
                                : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (option.value !== value) {
                              e.currentTarget.style.background = 'var(--bg-tertiary)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (option.value !== value) {
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                        >
                          {option.icon}
                          {option.label}
                        </button>,
                      )
                    }
                    return elements
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </div>
    </div>
  )
}