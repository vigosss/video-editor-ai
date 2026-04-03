// ==========================================
// 平台配置与 OAuth 相关类型定义
// ==========================================

import type { UploadPlatform } from './upload'

/** 平台配置 */
export interface PlatformConfig {
  platform: UploadPlatform
  name: string
  color: string           // 品牌主色
  icon: string            // 平台标识（用于前端图标渲染）
  authUrl: string         // OAuth 授权地址
  tokenUrl: string        // Token 换取地址
  scope: string           // 授权范围
}

/** 快手上传相关 API 配置 */
export interface KuaishouUploadConfig {
  /** 发起上传 */
  startUpload: string
  /** 分片上传（endpoint 动态替换） */
  fragmentUpload: string  // http://{endpoint}/api/upload/fragment
  /** 断点续传 */
  resumeUpload: string    // http://{endpoint}/api/upload/resume
  /** 完成分片上传 */
  completeUpload: string  // http://{endpoint}/api/upload/complete
  /** 发布视频 */
  publishVideo: string
}

/** 抖音上传相关 API 配置 */
export interface DouyinUploadConfig {
  /** 初始化分片上传 */
  partInit: string
  /** 分片上传 */
  partUpload: string
  /** 完成分片上传 */
  partComplete: string
  /** 创建视频 */
  createVideo: string
}

/** 平台授权状态 */
export interface PlatformAuthStatus {
  platform: UploadPlatform
  authorized: boolean
  accountName?: string    // 授权账号昵称
  avatarUrl?: string      // 头像
  expiresAt?: string      // Token 过期时间
}

/** OAuth Token */
export interface OAuthToken {
  accessToken: string
  refreshToken: string
  expiresIn: number       // 秒
  openId?: string         // 平台用户标识
  scope?: string
  obtainedAt: string      // ISO date string
}

/** 平台凭证（存储用，加密） */
export interface PlatformCredentials {
  clientKey: string
  clientSecret: string
}

/** 快手平台配置 */
export const KUAISHOU_CONFIG: PlatformConfig = {
  platform: 'kuaishou',
  name: '快手',
  color: '#FF4906',
  icon: 'kuaishou',
  authUrl: 'https://open.kuaishou.com/oauth2/authorize',
  tokenUrl: 'https://open.kuaishou.com/oauth2/access_token',
  scope: 'user_info,user_video_publish',
}

/** 快手上传 API 配置 */
export const KUAISHOU_UPLOAD_CONFIG: KuaishouUploadConfig = {
  startUpload: 'https://open.kuaishou.com/openapi/photo/start_upload',
  fragmentUpload: '/api/upload/fragment',               // 拼接 endpoint 使用
  resumeUpload: '/api/upload/resume',                   // 拼接 endpoint 使用
  completeUpload: '/api/upload/complete',                // 拼接 endpoint 使用
  publishVideo: 'https://open.kuaishou.com/openapi/photo/publish',
}

/** 抖音平台配置 */
export const DOUYIN_CONFIG: PlatformConfig = {
  platform: 'douyin',
  name: '抖音',
  color: '#000000',
  icon: 'douyin',
  authUrl: 'https://open.douyin.com/platform/oauth/connect/',
  tokenUrl: 'https://open.douyin.com/oauth/access_token/',
  scope: 'user_info,video.create',
}

/** 抖音上传 API 配置 */
export const DOUYIN_UPLOAD_CONFIG: DouyinUploadConfig = {
  partInit: 'https://open.douyin.com/api/douyin/v1/video/part/init/',
  partUpload: 'https://open.douyin.com/api/douyin/v1/video/part/upload/',
  partComplete: 'https://open.douyin.com/api/douyin/v1/video/part/complete/',
  createVideo: 'https://open.douyin.com/api/douyin/v1/video/create/',
}

/** 平台配置映射 */
export const PLATFORM_CONFIGS: Record<UploadPlatform, PlatformConfig> = {
  kuaishou: KUAISHOU_CONFIG,
  douyin: DOUYIN_CONFIG,
}