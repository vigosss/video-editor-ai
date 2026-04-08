// ==========================================
// Electron API 类型定义
// ==========================================

import type { Project, CreateProjectParams } from './project'
import type { Clip } from './clip'
import type { VideoInfo } from './video'
import type { PipelineProgress } from './pipeline'
import type { AppSettings, WhisperModelSize } from './settings'
import type { UploadRecord, UploadPlatform, PublishParams, UploadProgress } from './upload'
import type { PlatformAuthStatus } from './platform'
import type { PromptTemplate } from './prompt'
import type { GLMModel, AnalysisMode } from './project'
import type { BGMTrack, BeatInfo } from './bgm'

/** 文件过滤器 */
export interface FileFilter {
  name: string
  extensions: string[]
}

/** 更新信息 */
export interface UpdateInfo {
  version: string
  releaseNotes?: string | Array<{ note: string; version: string }>
  releaseName?: string
  releaseDate?: string
}

/** 更新下载进度 */
export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

/** 更新错误 */
export interface UpdateError {
  message: string
}

/** 暴露给渲染进程的 API */
export interface ElectronAPI {
  // 项目操作
  createProject: (params: CreateProjectParams) => Promise<Project>
  listProjects: () => Promise<Project[]>
  getProject: (id: string) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>
  getProjectClips: (projectId: string) => Promise<Clip[]>

  // 视频处理
  getVideoInfo: (filePath: string) => Promise<VideoInfo>
  startProcess: (projectId: string) => Promise<void>
  cancelProcess: (projectId: string) => Promise<void>
  checkFfmpeg: () => Promise<boolean>
  extractAudio: (videoPath: string, outputDir?: string) => Promise<string>
  extractFrames: (videoPath: string, outputDir: string, interval?: number) => Promise<string[]>
  clipVideo: (videoPath: string, clips: Array<{ startTime: number; endTime: number; reason?: string }>, outputDir: string) => Promise<string[]>
  mergeClips: (clipPaths: string[], outputPath: string) => Promise<string>
  embedSubtitles: (videoPath: string, srtPath: string, outputPath: string) => Promise<string>
  onProgress: (callback: (progress: PipelineProgress) => void) => () => void

  // 设置
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: Partial<AppSettings>) => Promise<void>

  // 上传
  startUpload: (params: PublishParams) => Promise<UploadRecord>
  cancelUpload: (projectId: string, platform: UploadPlatform) => Promise<void>
  retryUpload: (uploadId: string) => Promise<UploadRecord>
  getUploadRecords: (projectId: string) => Promise<UploadRecord[]>
  checkPlatformAuth: (platform: UploadPlatform) => Promise<PlatformAuthStatus>
  authorizePlatform: (platform: UploadPlatform) => Promise<PlatformAuthStatus>
  revokePlatformAuth: (platform: UploadPlatform) => Promise<void>
  onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void

  // Whisper 语音识别
  whisperTranscribe: (audioPath: string, modelSize: WhisperModelSize, outputDir?: string) => Promise<{
    segments: Array<{ id: number; startTime: number; endTime: number; text: string }>
    fullText: string
    srtPath: string
  }>
  whisperDownloadModel: (modelSize: WhisperModelSize) => Promise<{
    size: WhisperModelSize
    downloaded: boolean
    path: string
  }>
  whisperGetModels: () => Promise<Array<{
    size: WhisperModelSize
    downloaded: boolean
    path: string
    fileSize: number
  }>>
  whisperDeleteModel: (modelSize: WhisperModelSize) => Promise<{ success: boolean }>
  onWhisperProgress: (callback: (progress: {
    type: 'download' | 'transcribe'
    modelSize?: WhisperModelSize
    progress: number
    message: string
  }) => void) => () => void

  // Prompt 模板
  listTemplates: () => Promise<PromptTemplate[]>
  createTemplate: (name: string, content: string) => Promise<PromptTemplate>
  updateTemplate: (id: string, name: string, content: string) => Promise<PromptTemplate>
  deleteTemplate: (id: string) => Promise<void>

  // GLM 分析
  glmAnalyze: (options: {
    framePaths: string[]
    subtitleText: string
    userPrompt: string
    model: GLMModel
    analysisMode: AnalysisMode
    systemPrompt?: string
    apiKey?: string
  }) => Promise<{
    success: boolean
    data?: {
      clips: Array<{ startTime: number; endTime: number; reason: string }>
      rawResponse: string
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    }
    error?: { message: string; code: string; statusCode?: number }
  }>
  glmValidateKey: (apiKey: string) => Promise<{ success: boolean; data: boolean }>
  onGlmProgress: (callback: (progress: { progress: number; message: string }) => void) => () => void

  // BGM 背景音乐
  listBgmTracks: () => Promise<BGMTrack[]>
  getBgmTrackPath: (trackId: string) => Promise<string>
  analyzeBgmBeats: (trackId: string) => Promise<BeatInfo>

  // 对话框
  openFileDialog: (filters?: FileFilter[]) => Promise<string | null>
  openFilesDialog: (filters?: FileFilter[]) => Promise<string[] | null>
  openDirectoryDialog: () => Promise<string | null>

  // 系统
  openPath: (path: string) => Promise<string>

  // 平台信息
  platform: string

  // 窗口控制
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>

  // Splash 窗口
  splashFinished: () => void

  // 自动更新
  updaterCheck: () => Promise<void>
  updaterDownload: () => Promise<void>
  updaterInstall: () => Promise<void>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateNotAvailable: (callback: () => void) => () => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
  onUpdateError: (callback: (error: UpdateError) => void) => () => void
}
