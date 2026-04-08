// ==========================================
// 更新 IPC 处理器
// ==========================================

import { checkForUpdate, downloadUpdate, quitAndInstall } from '../services/updater'
import { handleWithLog } from '../utils/logger'

/** 注册更新相关 IPC 处理器 */
export function registerUpdaterIPC(): void {
  // 手动检查更新
  handleWithLog('updater:check', async () => {
    await checkForUpdate()
  })

  // 下载更新
  handleWithLog('updater:download', async () => {
    await downloadUpdate()
  })

  // 安装更新并重启
  handleWithLog('updater:install', () => {
    quitAndInstall()
  })
}
