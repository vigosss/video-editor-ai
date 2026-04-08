import { dialog, BrowserWindow, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { FileFilter } from '../../shared/api'
import { handleWithLog } from '../utils/logger'

/** 注册对话框 IPC 处理器 */
export function registerDialogIPC(): void {
  // 打开文件选择对话框（单文件）
  handleWithLog(
    IPC_CHANNELS.DIALOG_OPEN_FILE,
    async (_event, filters?: FileFilter[]): Promise<string | null> => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null

      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: filters ?? [{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      return result.filePaths[0]
    },
  )

  // 打开文件选择对话框（多文件）
  handleWithLog(
    IPC_CHANNELS.DIALOG_OPEN_FILES,
    async (_event, filters?: FileFilter[]): Promise<string[] | null> => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null

      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: filters ?? [{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      return result.filePaths
    },
  )

  // 打开目录选择对话框
  handleWithLog(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // 用系统默认程序打开文件
  handleWithLog(
    IPC_CHANNELS.SHELL_OPEN_PATH,
    async (_event, filePath: string): Promise<string> => {
      return shell.openPath(filePath)
    },
  )
}
