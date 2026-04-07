import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

/** 确保目录存在，不存在则递归创建 */
function ensureDir(dir: string): string {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/** 应用用户数据目录 */
export function getUserDataPath(): string {
  return app.getPath('userData')
}

/** 数据库文件路径 */
export function getDatabasePath(): string {
  return join(getUserDataPath(), 'video-editor.db')
}

/** 临时文件目录 */
export function getTempDir(): string {
  return ensureDir(join(getUserDataPath(), 'temp'))
}

/** 项目输出目录 */
export function getProjectsDir(): string {
  return ensureDir(join(getUserDataPath(), 'projects'))
}

/** 获取某个项目的目录 */
export function getProjectDir(projectId: string): string {
  return ensureDir(join(getProjectsDir(), projectId))
}

/** FFmpeg 二进制路径（开发/生产环境路径不同） */
export function getFfmpegPath(): string {
  const isWin = process.platform === 'win32'
  const ext = isWin ? '.exe' : ''

  if (app.isPackaged) {
    // 生产环境：从 extraResources 中读取打包的 FFmpeg
    return join(process.resourcesPath, 'ffmpeg', `ffmpeg${ext}`)
  }

  // 开发环境：使用 npm 包提供的 FFmpeg
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
    return ffmpegPath
  } catch {
    return 'ffmpeg' // 降级：依赖系统 PATH
  }
}

/** FFprobe 二进制路径 */
export function getFfprobePath(): string {
  const isWin = process.platform === 'win32'
  const ext = isWin ? '.exe' : ''

  if (app.isPackaged) {
    return join(process.resourcesPath, 'ffmpeg', `ffprobe${ext}`)
  }

  // 开发环境：使用 npm 包提供的 ffprobe
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobePath = require('ffprobe-static').path
    return ffprobePath
  } catch {
    return 'ffprobe' // 降级：依赖系统 PATH
  }
}

/** Whisper 模型存储目录 */
export function getWhisperModelsDir(): string {
  return ensureDir(join(getUserDataPath(), 'whisper-models'))
}

/** Whisper CLI 二进制路径（开发/生产环境路径不同） */
export function getWhisperCliPath(): string {
  const isWin = process.platform === 'win32'
  const ext = isWin ? '.exe' : ''

  if (app.isPackaged) {
    // 生产环境：从 extraResources 中读取打包的 whisper-cli
    return join(process.resourcesPath, 'whisper', `whisper-cli${ext}`)
  }

  // 开发环境：使用 resources/whisper/ 目录中的二进制
  const devPath = join(__dirname, '..', '..', '..', 'resources', 'whisper', `whisper-cli${ext}`)
  if (existsSync(devPath)) {
    return devPath
  }

  // 降级：依赖系统 PATH
  return 'whisper-cli'
}

/** 日志目录 */
export function getLogsDir(): string {
  return ensureDir(join(getUserDataPath(), 'logs'))
}