// ==========================================
// BGM 背景音乐库管理服务
// ==========================================

import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, readdirSync } from 'fs'
import type { BGMTrack } from '../../shared/bgm'

// ==========================================
// 路径解析
// ==========================================

/** 获取 BGM 资源目录路径 */
export function getBgmDir(): string {
  if (app.isPackaged) {
    // 生产环境：从 extraResources 中读取
    return join(process.resourcesPath, 'bgm')
  }
  // 开发环境：使用项目 resources/bgm/ 目录
  return join(__dirname, '..', '..', 'resources', 'bgm')
}

/** 获取 BGM manifest 文件路径 */
function getManifestPath(): string {
  return join(getBgmDir(), 'manifest.json')
}

// ==========================================
// BGM 曲目查询
// ==========================================

/** 读取并解析 manifest.json */
let cachedManifest: BGMTrack[] | null = null

export function getBgmManifest(): BGMTrack[] {
  if (cachedManifest) return cachedManifest

  const manifestPath = getManifestPath()
  if (!existsSync(manifestPath)) {
    console.warn('[BGM] manifest.json 不存在:', manifestPath)
    cachedManifest = []
    return cachedManifest
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8')
    cachedManifest = JSON.parse(content) as BGMTrack[]
    return cachedManifest
  } catch (err) {
    console.error('[BGM] 解析 manifest.json 失败:', err)
    cachedManifest = []
    return cachedManifest
  }
}

/** 列出所有可用的 BGM 曲目（检查文件是否存在） */
export function listBgmTracks(): BGMTrack[] {
  const manifest = getBgmManifest()
  const bgmDir = getBgmDir()

  return manifest.filter(track => {
    const trackPath = join(bgmDir, track.filename)
    if (!existsSync(trackPath)) {
      console.warn(`[BGM] 曲目文件不存在: ${track.filename}`)
      return false
    }
    return true
  })
}

/** 获取 BGM 曲目的完整文件系统路径 */
export function getBgmTrackPath(trackId: string): string {
  const manifest = getBgmManifest()
  const track = manifest.find(t => t.id === trackId)

  if (!track) {
    throw new Error(`BGM 曲目不存在: ${trackId}`)
  }

  const trackPath = join(getBgmDir(), track.filename)
  if (!existsSync(trackPath)) {
    throw new Error(`BGM 曲目文件不存在: ${track.filename}`)
  }

  return trackPath
}

/** 随机选择一首 BGM 曲目 */
export function getRandomTrack(mood?: string): BGMTrack | null {
  let tracks = listBgmTracks()

  if (mood) {
    tracks = tracks.filter(t => t.mood === mood)
  }

  if (tracks.length === 0) return null

  const index = Math.floor(Math.random() * tracks.length)
  return tracks[index]
}

/** 清除 manifest 缓存（开发时用） */
export function clearBgmCache(): void {
  cachedManifest = null
}
