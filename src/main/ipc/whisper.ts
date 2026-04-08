// ==========================================
// Whisper 语音识别 IPC 处理器
// ==========================================

import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { WhisperModelSize } from '../../shared/settings'
import {
  transcribeAudio,
  downloadModel,
  getAvailableModels,
  deleteModel,
  getModelPath,
  isModelDownloaded,
} from '../services/whisper'
import { getProjectWorkDir } from '../services/ffmpeg'
import { handleWithLog } from '../utils/logger'

export function registerWhisperIPC(): void {
  // ==========================================
  // 转录音频
  // ==========================================
  handleWithLog(
    IPC_CHANNELS.WHISPER_TRANSCRIBE,
    async (event, audioPath: string, modelSize: WhisperModelSize, outputDir?: string) => {
      const srtOutputDir = outputDir ?? getProjectWorkDir('whisper')
      const srtPath = `${srtOutputDir}/transcript.srt`.replace(/\\/g, '/')

      return transcribeAudio(audioPath, modelSize, srtPath, (progress, message) => {
        // 通过 IPC 发送进度到渲染进程
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.WHISPER_PROGRESS, {
            type: 'transcribe',
            progress,
            message,
          })
        }
      })
    },
  )

  // ==========================================
  // 下载模型
  // ==========================================
  handleWithLog(
    IPC_CHANNELS.WHISPER_DOWNLOAD_MODEL,
    async (event, modelSize: WhisperModelSize) => {
      await downloadModel(modelSize, (progress, message) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.WHISPER_PROGRESS, {
            type: 'download',
            modelSize,
            progress,
            message,
          })
        }
      })

      // 返回下载后的模型信息
      return {
        size: modelSize,
        downloaded: true,
        path: getModelPath(modelSize),
      }
    },
  )

  // ==========================================
  // 获取所有模型信息
  // ==========================================
  handleWithLog(IPC_CHANNELS.WHISPER_GET_MODELS, async () => {
    return getAvailableModels()
  })

  // ==========================================
  // 删除模型
  // ==========================================
  handleWithLog(
    IPC_CHANNELS.WHISPER_DELETE_MODEL,
    async (_event, modelSize: WhisperModelSize) => {
      deleteModel(modelSize)
      return { success: true }
    },
  )
}
