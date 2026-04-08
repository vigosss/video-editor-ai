// ==========================================
// 日志导出 IPC 处理器
// ==========================================

import { IPC_CHANNELS } from '../../shared/ipc'
import { handleWithLog, getLogFilePath } from '../utils/logger'
import { readFileSync, statSync } from 'fs'

export function registerLogIPC(): void {
  // 获取日志文件路径
  handleWithLog(IPC_CHANNELS.LOG_GET_PATH, async () => {
    return getLogFilePath()
  })

  // 获取日志内容（默认最后 500 行）
  handleWithLog(IPC_CHANNELS.LOG_GET_CONTENTS, async (_event, options?: { tail?: number }) => {
    const filePath = getLogFilePath()
    const maxTail = options?.tail ?? 500

    const stat = statSync(filePath)
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    return {
      path: filePath,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      content: lines.slice(-maxTail).join('\n'),
      totalLines: lines.length,
    }
  })
}
