import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  // 项目操作
  createProject: (params) => ipcRenderer.invoke('project:create', params),
  listProjects: () => ipcRenderer.invoke('project:list'),
  getProject: (id) => ipcRenderer.invoke('project:get', id),
  deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
  updateProject: (id, data) => ipcRenderer.invoke('project:update', id, data),
  getProjectClips: (projectId) => ipcRenderer.invoke('project:getClips', projectId),

  // 视频处理
  getVideoInfo: (filePath) => ipcRenderer.invoke('video:getInfo', filePath),
  startProcess: (projectId) => ipcRenderer.invoke('video:startProcess', projectId),
  cancelProcess: (projectId) => ipcRenderer.invoke('video:cancelProcess', projectId),
  checkFfmpeg: () => ipcRenderer.invoke('video:checkFfmpeg'),
  extractAudio: (videoPath, outputDir) => ipcRenderer.invoke('video:extractAudio', videoPath, outputDir),
  extractFrames: (videoPath, outputDir, interval) => ipcRenderer.invoke('video:extractFrames', videoPath, outputDir, interval),
  clipVideo: (videoPath, clips, outputDir) => ipcRenderer.invoke('video:clip', videoPath, clips, outputDir),
  mergeClips: (clipPaths, outputPath) => ipcRenderer.invoke('video:merge', clipPaths, outputPath),
  embedSubtitles: (videoPath, srtPath, outputPath) => ipcRenderer.invoke('video:embedSubtitles', videoPath, srtPath, outputPath),
  onProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('video:progress', handler)
    return () => ipcRenderer.removeListener('video:progress', handler)
  },

  // 设置
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),

  // 上传
  startUpload: (params) => ipcRenderer.invoke('upload:start', params),
  cancelUpload: (projectId, platform) => ipcRenderer.invoke('upload:cancel', projectId, platform),
  retryUpload: (uploadId) => ipcRenderer.invoke('upload:retry', uploadId),
  getUploadRecords: (projectId) => ipcRenderer.invoke('upload:getRecords', projectId),
  checkPlatformAuth: (platform) => ipcRenderer.invoke('upload:checkAuth', platform),
  authorizePlatform: (platform) => ipcRenderer.invoke('upload:authorize', platform),
  revokePlatformAuth: (platform) => ipcRenderer.invoke('upload:revoke', platform),
  onUploadProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('upload:progress', handler)
    return () => ipcRenderer.removeListener('upload:progress', handler)
  },

  // Whisper 语音识别
  whisperTranscribe: (audioPath, modelSize, outputDir) => ipcRenderer.invoke('whisper:transcribe', audioPath, modelSize, outputDir),
  whisperDownloadModel: (modelSize) => ipcRenderer.invoke('whisper:downloadModel', modelSize),
  whisperGetModels: () => ipcRenderer.invoke('whisper:getModels'),
  whisperDeleteModel: (modelSize) => ipcRenderer.invoke('whisper:deleteModel', modelSize),
  onWhisperProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('whisper:progress', handler)
    return () => ipcRenderer.removeListener('whisper:progress', handler)
  },

  // Prompt 模板
  listTemplates: () => ipcRenderer.invoke('template:list'),
  createTemplate: (name, content) => ipcRenderer.invoke('template:create', name, content),
  updateTemplate: (id, name, content) => ipcRenderer.invoke('template:update', id, name, content),
  deleteTemplate: (id) => ipcRenderer.invoke('template:delete', id),

  // GLM 分析
  glmAnalyze: (options) => ipcRenderer.invoke('glm:analyze', options),
  glmValidateKey: (apiKey) => ipcRenderer.invoke('glm:validateKey', apiKey),
  onGlmProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('glm:progress', handler)
    return () => ipcRenderer.removeListener('glm:progress', handler)
  },

  // BGM 背景音乐
  listBgmTracks: () => ipcRenderer.invoke('bgm:listTracks'),
  getBgmTrackPath: (trackId) => ipcRenderer.invoke('bgm:getTrackPath', trackId),
  analyzeBgmBeats: (trackId) => ipcRenderer.invoke('bgm:analyzeBeats', trackId),

  // 对话框
  openFileDialog: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  openFilesDialog: (filters) => ipcRenderer.invoke('dialog:openFiles', filters),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),

  // 系统
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),

  // 自动更新
  updaterCheck: () => ipcRenderer.invoke('updater:check'),
  updaterDownload: () => ipcRenderer.invoke('updater:download'),
  updaterInstall: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateNotAvailable: (callback) => {
    const handler = () => {
      callback()
    }
    ipcRenderer.on('update:not-available', handler)
    return () => ipcRenderer.removeListener('update:not-available', handler)
  },
  onUpdateProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data as Parameters<typeof callback>[0])
    }
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // 平台信息
  platform: process.platform,

  // 窗口控制
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Splash 窗口
  splashFinished: () => ipcRenderer.send('splash:finished'),

  // 日志
  getLogPath: () => ipcRenderer.invoke('log:getPath'),
  getLogContents: (options?: { tail?: number }) => ipcRenderer.invoke('log:getContents', options),
}

// 通过 contextBridge 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', api)