// ==========================================
// OAuth 凭证服务 — 提取为公共模块
// ==========================================

import type { UploadPlatform } from '../../shared/upload'

/**
 * 获取平台凭证（Client Key / Secret）
 * 从环境变量读取
 */
export function getPlatformCredentials(platform: UploadPlatform): { clientKey: string; clientSecret: string } | null {
  // 从环境变量读取凭证（优先）
  const envKey = process.env[`${platform.toUpperCase()}_CLIENT_KEY`]
  const envSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`]

  if (envKey && envSecret) {
    return { clientKey: envKey, clientSecret: envSecret }
  }

  // 未配置凭证时返回 null
  return null
}