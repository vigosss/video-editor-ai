// ==========================================
// 上传相关类型定义
// ==========================================

/** 上传平台 */
export type UploadPlatform = 'kuaishou' | 'douyin'

/** 上传状态 */
export type UploadStatus = 'pending' | 'authorizing' | 'uploading' | 'processing' | 'completed' | 'failed'

/** 上传记录 */
export interface UploadRecord {
  id: string
  projectId: string
  platform: UploadPlatform
  title: string
  description: string
  tags: string
  coverPath: string
  videoId: string
  videoUrl: string
  status: UploadStatus
  errorMessage: string
  uploadedAt: string
}

/** 发布参数（前端 → 后端） */
export interface PublishParams {
  projectId: string
  platform: UploadPlatform
  title: string
  description: string
  tags: string
  coverPath?: string
  videoPath?: string
}

/** 上传进度 */
export interface UploadProgress {
  platform: UploadPlatform
  projectId: string
  progress: number       // 0-100
  message: string
  status: UploadStatus
}