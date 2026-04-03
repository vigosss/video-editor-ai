// ==========================================
// 老兵AI智剪 - 共享类型统一导出入口
// ==========================================

// 项目相关
export type {
  ProjectStatus,
  AnalysisMode,
  GLMModel,
  ProcessingStep,
  Project,
  CreateProjectParams,
} from './project'

// 剪辑片段
export type { Clip } from './clip'

// 上传相关
export type { UploadPlatform, UploadStatus, UploadRecord, PublishParams, UploadProgress } from './upload'

// 平台配置
export type { PlatformConfig, PlatformAuthStatus, OAuthToken, PlatformCredentials } from './platform'
export { PLATFORM_CONFIGS, KUAISHOU_CONFIG, DOUYIN_CONFIG } from './platform'

// 设置相关
export type {
  WhisperModelSize,
  OutputFormat,
  Resolution,
  ThemeMode,
  AppSettings,
} from './settings'

// Prompt 模板
export type { PromptTemplate } from './prompt'

// 视频信息
export type { VideoInfo } from './video'

// 处理管线
export type { PipelineProgress } from './pipeline'

// IPC 通道常量
export { IPC_CHANNELS } from './ipc'

// Electron API
export type { ElectronAPI, FileFilter, UpdateInfo, UpdateProgress, UpdateError } from './api'
