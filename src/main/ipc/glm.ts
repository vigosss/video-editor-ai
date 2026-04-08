import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import { analyzeVideo, validateApiKey, GLMError } from '../services/glm'
import type { AnalyzeVideoOptions } from '../services/glm'
import { handleWithLog } from '../utils/logger'

/** 注册 GLM 相关 IPC 处理器 */
export function registerGlmIPC(): void {
  // GLM 分析视频
  handleWithLog(IPC_CHANNELS.GLM_ANALYZE, async (event, options: AnalyzeVideoOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    const onProgress = (progress: number, message: string) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.GLM_PROGRESS, { progress, message })
      }
    }

    try {
      const result = await analyzeVideo(options, onProgress)
      return { success: true, data: result }
    } catch (err) {
      if (err instanceof GLMError) {
        return {
          success: false,
          error: {
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
          },
        }
      }
      return {
        success: false,
        error: {
          message: (err as Error).message,
          code: 'UNKNOWN_ERROR',
        },
      }
    }
  })

  // GLM API Key 验证
  handleWithLog(IPC_CHANNELS.GLM_VALIDATE_KEY, async (_event, apiKey: string) => {
    try {
      const valid = await validateApiKey(apiKey)
      return { success: true, data: valid }
    } catch (err) {
      return { success: false, data: false }
    }
  })
}
