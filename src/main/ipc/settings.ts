import { IPC_CHANNELS } from '../../shared/ipc'
import { getAllSettings, setSettings } from '../services/database'
import type { AppSettings } from '../../shared/settings'
import { handleWithLog } from '../utils/logger'

/** 注册设置相关 IPC 处理器 */
export function registerSettingsIPC(): void {
  // 获取所有设置
  handleWithLog(IPC_CHANNELS.SETTINGS_GET, async (): Promise<AppSettings> => {
    return getAllSettings()
  })

  // 批量更新设置
  handleWithLog(IPC_CHANNELS.SETTINGS_SET, async (_event, data: Partial<AppSettings>): Promise<void> => {
    if (!data || typeof data !== 'object') {
      throw new Error('设置数据无效')
    }
    setSettings(data)
  })
}
