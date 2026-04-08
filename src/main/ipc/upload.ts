// ==========================================
// 上传 IPC 处理器 — 完整实现
// ==========================================

import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { UploadPlatform, PublishParams, UploadProgress } from '../../shared/upload'
import { startVideoUpload, cancelUpload, retryUpload, getProjectUploadRecords } from '../services/upload'
import { authorizePlatform, revokePlatformAuth, checkPlatformAuth } from '../services/oauth'
import { handleWithLog } from '../utils/logger'

/**
 * 注册上传相关 IPC 处理器
 */
export function registerUploadIPC(): void {
  // 开始上传
  handleWithLog(IPC_CHANNELS.UPLOAD_START, async (event, params: PublishParams) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const onProgress = (progress: UploadProgress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.UPLOAD_PROGRESS, progress)
      }
    }
    return startVideoUpload(params, onProgress)
  })

  // 取消上传
  handleWithLog(IPC_CHANNELS.UPLOAD_CANCEL, async (_event, projectId: string, platform: UploadPlatform) => {
    return cancelUpload(projectId, platform)
  })

  // 重试上传
  handleWithLog(IPC_CHANNELS.UPLOAD_RETRY, async (event, uploadId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const onProgress = (progress: UploadProgress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.UPLOAD_PROGRESS, progress)
      }
    }
    return retryUpload(uploadId, onProgress)
  })

  // 获取上传记录
  handleWithLog(IPC_CHANNELS.UPLOAD_GET_RECORDS, async (_event, projectId: string) => {
    return getProjectUploadRecords(projectId)
  })

  // 检查平台授权状态
  handleWithLog(IPC_CHANNELS.UPLOAD_CHECK_AUTH, async (_event, platform: UploadPlatform) => {
    return checkPlatformAuth(platform)
  })

  // 发起平台授权
  handleWithLog(IPC_CHANNELS.UPLOAD_AUTHORIZE, async (_event, platform: UploadPlatform) => {
    const result = await authorizePlatform(platform)
    if (result.authorized) {
      return checkPlatformAuth(platform)
    }
    throw new Error(result.error || '授权失败')
  })

  // 取消平台授权
  handleWithLog(IPC_CHANNELS.UPLOAD_REVOKE, async (_event, platform: UploadPlatform) => {
    return revokePlatformAuth(platform)
  })
}
