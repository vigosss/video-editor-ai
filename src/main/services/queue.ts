// ==========================================
// 处理队列服务 — 单线程任务队列
// ==========================================

import { BrowserWindow } from 'electron'
import { runPipeline } from './pipeline'
import { updateProjectStatus } from './database'
import type { QueueItem, QueueStatus } from '../../shared/pipeline'

// ==========================================
// 队列管理器（单例）
// ==========================================

/** 等待队列 */
const queue: QueueItem[] = []

/** 当前正在处理的项目 ID */
let currentProjectId: string | null = null

/** 当前处理的 AbortController */
let currentAbortController: AbortController | null = null

/** BrowserWindow 引用（用于发送进度） */
let mainWindow: BrowserWindow | null = null

/** 是否正在处理 */
let isProcessing = false

// ==========================================
// 公共方法
// ==========================================

/** 设置 BrowserWindow 引用 */
export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

/** 添加项目到处理队列 */
export function addToQueue(projectId: string): void {
  // 检查是否已在队列中
  const exists = queue.some((item) => item.projectId === projectId)
  if (exists || currentProjectId === projectId) {
    console.log(`[Queue] 项目 ${projectId} 已在队列中，跳过`)
    return
  }

  queue.push({
    projectId,
    status: 'waiting',
    addedAt: Date.now(),
  })

  console.log(`[Queue] 项目 ${projectId} 已加入队列，当前队列长度: ${queue.length}`)

  // 如果没有正在处理的任务，立即启动队列处理
  if (!isProcessing) {
    processQueue()
  }
}

/** 取消指定项目的处理 */
export function cancelProject(projectId: string): boolean {
  // 如果是当前正在处理的项目
  if (currentProjectId === projectId && currentAbortController) {
    currentAbortController.abort()
    console.log(`[Queue] 已发送取消信号: ${projectId}`)
    return true
  }

  // 如果在等待队列中，标记为已取消
  const item = queue.find((i) => i.projectId === projectId)
  if (item) {
    item.status = 'cancelled'
    console.log(`[Queue] 已从队列中取消: ${projectId}`)
    return true
  }

  console.log(`[Queue] 未找到项目: ${projectId}`)
  return false
}

/** 获取队列状态 */
export function getQueueStatusInfo(): QueueStatus {
  return {
    currentProjectId,
    queue: queue.filter((item) => item.status !== 'cancelled'),
    isProcessing,
  }
}

// ==========================================
// 内部方法
// ==========================================

/** 处理队列（循环消费） */
async function processQueue(): Promise<void> {
  if (isProcessing) return

  isProcessing = true

  while (queue.length > 0) {
    // 取出下一个未取消的项目
    const nextItem = queue.find((item) => item.status === 'waiting')
    if (!nextItem) {
      // 所有项目都已取消或队列为空
      queue.length = 0
      break
    }

    // 从队列中移除
    const idx = queue.indexOf(nextItem)
    queue.splice(idx, 1)

    currentProjectId = nextItem.projectId
    currentAbortController = new AbortController()

    console.log(`[Queue] 开始处理项目: ${currentProjectId}`)

    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('主窗口不可用')
      }

      await runPipeline(currentProjectId, mainWindow, currentAbortController.signal)
      console.log(`[Queue] 项目处理成功: ${currentProjectId}`)
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('取消')) {
        console.log(`[Queue] 项目已取消: ${currentProjectId}`)
      } else {
        console.error(`[Queue] 项目处理失败: ${currentProjectId}`, msg)
      }
    } finally {
      currentProjectId = null
      currentAbortController = null
    }
  }

  isProcessing = false
  console.log('[Queue] 队列处理完毕')
}