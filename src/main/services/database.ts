import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { getDatabasePath, getProjectsDir } from '../utils/paths'
import { encrypt, decrypt } from '../utils/crypto'
import { DEFAULT_SYSTEM_PROMPT } from '../../shared/constants'
import type { Project, CreateProjectParams, ProjectStatus, ProcessingStep } from '../../shared/project'
import type { Clip } from '../../shared/clip'
import type { UploadRecord, UploadPlatform, UploadStatus } from '../../shared/upload'
import type { OAuthToken, PlatformAuthStatus } from '../../shared/platform'
import type { AppSettings } from '../../shared/settings'
import type { PromptTemplate } from '../../shared/prompt'

// ==========================================
// 数据库服务 — 单例模式
// ==========================================

let db: Database.Database | null = null

/** 需要加密的设置键 */
const SENSITIVE_KEYS = new Set(['glmApiKey'])

/** 获取数据库实例（懒初始化） */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('数据库尚未初始化，请先调用 initDatabase()')
  }
  return db
}

/** 初始化数据库连接并执行迁移 */
export function initDatabase(): void {
  const dbPath = getDatabasePath()
  db = new Database(dbPath)

  // 启用 WAL 模式，提升并发读性能
  db.pragma('journal_mode = WAL')
  // 启用外键约束
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  console.log(`[database] 初始化完成: ${dbPath}`)
}

/** 关闭数据库连接 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[database] 连接已关闭')
  }
}

// ==========================================
// 数据库迁移
// ==========================================

function runMigrations(database: Database.Database): void {
  database.exec(`
    -- 项目表
    CREATE TABLE IF NOT EXISTS projects (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      video_path    TEXT NOT NULL,
      output_path   TEXT NOT NULL,
      prompt        TEXT NOT NULL DEFAULT '',
      model         TEXT NOT NULL DEFAULT 'GLM-4.6V-FlashX',
      analysis_mode TEXT NOT NULL DEFAULT 'standard',
      status        TEXT NOT NULL DEFAULT 'pending',
      progress      INTEGER NOT NULL DEFAULT 0,
      current_step  TEXT NOT NULL DEFAULT 'idle',
      error_message TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at  TEXT
    );

    -- 剪辑片段表
    CREATE TABLE IF NOT EXISTS clips (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      start_time  REAL NOT NULL,
      end_time    REAL NOT NULL,
      reason      TEXT NOT NULL DEFAULT ''
    );

    -- 上传记录表
    CREATE TABLE IF NOT EXISTS uploads (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      platform      TEXT NOT NULL,
      title         TEXT NOT NULL DEFAULT '',
      description   TEXT NOT NULL DEFAULT '',
      tags          TEXT NOT NULL DEFAULT '',
      cover_path    TEXT NOT NULL DEFAULT '',
      video_id      TEXT NOT NULL DEFAULT '',
      video_url     TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT NOT NULL DEFAULT '',
      uploaded_at   TEXT
    );

    -- 设置表（键值对）
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Prompt 模板表
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_clips_project_id ON clips(project_id);
    CREATE INDEX IF NOT EXISTS idx_uploads_project_id ON uploads(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  `)
}

// ==========================================
// 项目 CRUD
// ==========================================

/** 创建项目 */
export function createProject(params: CreateProjectParams): Project {
  const database = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT INTO projects (id, name, video_path, output_path, prompt, model, analysis_mode, status, progress, current_step, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, 'idle', NULL, ?)
  `)

  stmt.run(id, params.name, params.videoPath, params.outputPath, params.prompt, params.model, params.analysisMode, now)

  return {
    id,
    name: params.name,
    videoPath: params.videoPath,
    outputPath: params.outputPath,
    prompt: params.prompt,
    model: params.model,
    analysisMode: params.analysisMode,
    status: 'pending',
    progress: 0,
    currentStep: 'idle',
    errorMessage: null,
    createdAt: now,
    completedAt: null,
  }
}

/** 获取项目列表（按创建时间倒序） */
export function listProjects(): Project[] {
  const database = getDatabase()
  const rows = database.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as RawProjectRow[]
  return rows.map(rowToProject)
}

/** 获取单个项目 */
export function getProject(id: string): Project | null {
  const database = getDatabase()
  const row = database.prepare('SELECT * FROM projects WHERE id = ?').get(id) as RawProjectRow | undefined
  return row ? rowToProject(row) : null
}

/** 更新项目 */
export function updateProject(id: string, data: Partial<Project>): Project {
  const database = getDatabase()
  const existing = getProject(id)
  if (!existing) {
    throw new Error(`项目不存在: ${id}`)
  }

  const merged = { ...existing, ...data }

  const stmt = database.prepare(`
    UPDATE projects SET
      name = ?, video_path = ?, output_path = ?, prompt = ?,
      model = ?, analysis_mode = ?, status = ?, progress = ?,
      current_step = ?, error_message = ?, completed_at = ?
    WHERE id = ?
  `)

  stmt.run(
    merged.name,
    merged.videoPath,
    merged.outputPath,
    merged.prompt,
    merged.model,
    merged.analysisMode,
    merged.status,
    merged.progress,
    merged.currentStep,
    merged.errorMessage,
    merged.completedAt,
    id,
  )

  return merged
}

/** 更新项目状态 */
export function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  currentStep: ProcessingStep,
  progress: number,
  errorMessage?: string,
): void {
  const database = getDatabase()
  const completedAt = status === 'completed' ? new Date().toISOString() : null

  database.prepare(`
    UPDATE projects SET status = ?, current_step = ?, progress = ?, error_message = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `).run(status, currentStep, progress, errorMessage ?? null, completedAt, id)
}

/** 删除项目（级联删除关联的 clips 和 uploads） */
export function deleteProject(id: string): void {
  const database = getDatabase()
  database.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

// ==========================================
// 剪辑片段
// ==========================================

/** 创建剪辑片段 */
export function createClip(projectId: string, startTime: number, endTime: number, reason: string): Clip {
  const database = getDatabase()
  const id = randomUUID()
  database.prepare('INSERT INTO clips (id, project_id, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)').run(id, projectId, startTime, endTime, reason)
  return { id, projectId, startTime, endTime, reason }
}

/** 批量创建剪辑片段（事务） */
export function createClips(projectId: string, clips: Array<{ startTime: number; endTime: number; reason: string }>): Clip[] {
  const database = getDatabase()
  const stmt = database.prepare('INSERT INTO clips (id, project_id, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)')
  const transaction = database.transaction(() => {
    return clips.map((c) => {
      const id = randomUUID()
      stmt.run(id, projectId, c.startTime, c.endTime, c.reason)
      return { id, projectId, startTime: c.startTime, endTime: c.endTime, reason: c.reason }
    })
  })
  return transaction()
}

/** 删除项目的所有剪辑片段 */
export function deleteClipsByProject(projectId: string): void {
  const database = getDatabase()
  database.prepare('DELETE FROM clips WHERE project_id = ?').run(projectId)
}

/** 获取项目的所有剪辑片段 */
export function getClipsByProject(projectId: string): Clip[] {
  const database = getDatabase()
  const rows = database.prepare('SELECT * FROM clips WHERE project_id = ? ORDER BY start_time').all(projectId) as RawClipRow[]
  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    startTime: r.start_time,
    endTime: r.end_time,
    reason: r.reason,
  }))
}

// ==========================================
// 上传记录
// ==========================================

/** 创建上传记录（含发布参数） */
export function createUploadRecord(
  projectId: string,
  platform: UploadPlatform,
  title: string = '',
  description: string = '',
  tags: string = '',
  coverPath: string = '',
): UploadRecord {
  const database = getDatabase()
  const id = randomUUID()
  database.prepare(`
    INSERT INTO uploads (id, project_id, platform, title, description, tags, cover_path, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, projectId, platform, title, description, tags, coverPath)
  return {
    id,
    projectId,
    platform,
    title,
    description,
    tags,
    coverPath,
    videoId: '',
    videoUrl: '',
    status: 'pending' as UploadStatus,
    errorMessage: '',
    uploadedAt: '',
  }
}

/** 更新上传记录 */
export function updateUploadRecord(id: string, data: Partial<UploadRecord>): void {
  const database = getDatabase()
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(data.tags) }
  if (data.coverPath !== undefined) { fields.push('cover_path = ?'); values.push(data.coverPath) }
  if (data.videoId !== undefined) { fields.push('video_id = ?'); values.push(data.videoId) }
  if (data.videoUrl !== undefined) { fields.push('video_url = ?'); values.push(data.videoUrl) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(data.errorMessage) }
  if (data.uploadedAt !== undefined) { fields.push('uploaded_at = ?'); values.push(data.uploadedAt) }

  if (fields.length === 0) return

  values.push(id)
  database.prepare(`UPDATE uploads SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

/** 获取项目的上传记录 */
export function getUploadsByProject(projectId: string): UploadRecord[] {
  const database = getDatabase()
  const rows = database.prepare('SELECT * FROM uploads WHERE project_id = ? ORDER BY uploaded_at DESC').all(projectId) as RawUploadRow[]
  return rows.map(rowToUploadRecord)
}

/** 获取单个上传记录 */
export function getUploadRecord(id: string): UploadRecord | null {
  const database = getDatabase()
  const row = database.prepare('SELECT * FROM uploads WHERE id = ?').get(id) as RawUploadRow | undefined
  return row ? rowToUploadRecord(row) : null
}

// ==========================================
// 平台 OAuth Token 存储
// ==========================================

/** 保存平台 OAuth Token（加密） */
export function savePlatformToken(platform: UploadPlatform, token: OAuthToken): void {
  const database = getDatabase()
  const encrypted = encrypt(JSON.stringify(token))
  database.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`${platform}_oauth_token`, encrypted)
}

/** 获取平台 OAuth Token（解密） */
export function getPlatformToken(platform: UploadPlatform): OAuthToken | null {
  const database = getDatabase()
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(`${platform}_oauth_token`) as { value: string } | undefined
  if (!row) return null
  try {
    return JSON.parse(decrypt(row.value)) as OAuthToken
  } catch {
    return null
  }
}

/** 删除平台 OAuth Token */
export function deletePlatformToken(platform: UploadPlatform): void {
  const database = getDatabase()
  database.prepare('DELETE FROM settings WHERE key = ?').run(`${platform}_oauth_token`)
}

/** 获取平台授权状态 */
export function getPlatformAuthStatus(platform: UploadPlatform): PlatformAuthStatus {
  const token = getPlatformToken(platform)
  if (!token) {
    return { platform, authorized: false }
  }

  // 检查 token 是否过期
  const obtainedAt = new Date(token.obtainedAt).getTime()
  const expiresAt = obtainedAt + token.expiresIn * 1000
  const isExpired = Date.now() > expiresAt

  return {
    platform,
    authorized: !isExpired,
    expiresAt: new Date(expiresAt).toISOString(),
  }
}

// ==========================================
// 设置
// ==========================================

/** 默认设置 */
const DEFAULT_SETTINGS: AppSettings = {
  glmApiKey: '',
  defaultModel: 'GLM-4.6V-FlashX',
  defaultAnalysisMode: 'standard',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  whisperModel: 'base',
  outputFormat: 'mp4',
  outputResolution: '1080p',
  projectSavePath: getProjectsDir(),
  theme: 'dark',
}

/** 获取所有设置 */
export function getAllSettings(): AppSettings {
  const database = getDatabase()
  const rows = database.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>

  const settings = { ...DEFAULT_SETTINGS }
  const settingsMap = new Map(rows.map((r) => [r.key, r.value]))

  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    if (settingsMap.has(key)) {
      let value = settingsMap.get(key)!
      // 敏感字段自动解密
      if (SENSITIVE_KEYS.has(key)) {
        value = decrypt(value)
      }
      ;(settings as Record<string, unknown>)[key] = value
    }
  }

  return settings
}

/** 批量更新设置 */
export function setSettings(data: Partial<AppSettings>): void {
  const database = getDatabase()
  const stmt = database.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

  const transaction = database.transaction(() => {
    for (const [key, rawValue] of Object.entries(data)) {
      let value = String(rawValue)
      // 敏感字段自动加密
      if (SENSITIVE_KEYS.has(key)) {
        value = encrypt(value)
      }
      stmt.run(key, value)
    }
  })

  transaction()
}

// ==========================================
// Prompt 模板
// ==========================================

/** 创建 Prompt 模板 */
export function createPromptTemplate(name: string, content: string): PromptTemplate {
  const database = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()
  database.prepare('INSERT INTO prompt_templates (id, name, content, created_at) VALUES (?, ?, ?, ?)').run(id, name, content, now)
  return { id, name, content, createdAt: now }
}

/** 获取所有 Prompt 模板 */
export function listPromptTemplates(): PromptTemplate[] {
  const database = getDatabase()
  return database.prepare('SELECT * FROM prompt_templates ORDER BY created_at DESC').all() as PromptTemplate[]
}

/** 更新 Prompt 模板 */
export function updatePromptTemplate(id: string, name: string, content: string): PromptTemplate {
  const database = getDatabase()
  database.prepare('UPDATE prompt_templates SET name = ?, content = ? WHERE id = ?').run(name, content, id)
  const row = database.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as PromptTemplate | undefined
  if (!row) throw new Error(`模板不存在: ${id}`)
  return row
}

/** 删除 Prompt 模板 */
export function deletePromptTemplate(id: string): void {
  const database = getDatabase()
  database.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id)
}

// ==========================================
// 行记录类型映射
// ==========================================

interface RawProjectRow {
  id: string
  name: string
  video_path: string
  output_path: string
  prompt: string
  model: string
  analysis_mode: string
  status: string
  progress: number
  current_step: string
  error_message: string | null
  created_at: string
  completed_at: string | null
}

interface RawClipRow {
  id: string
  project_id: string
  start_time: number
  end_time: number
  reason: string
}

interface RawUploadRow {
  id: string
  project_id: string
  platform: string
  title: string
  description: string
  tags: string
  cover_path: string
  video_id: string
  video_url: string
  status: string
  error_message: string
  uploaded_at: string | null
}

function rowToProject(row: RawProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    videoPath: row.video_path,
    outputPath: row.output_path,
    prompt: row.prompt,
    model: row.model as Project['model'],
    analysisMode: row.analysis_mode as Project['analysisMode'],
    status: row.status as ProjectStatus,
    progress: row.progress,
    currentStep: row.current_step as ProcessingStep,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function rowToUploadRecord(row: RawUploadRow): UploadRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    platform: row.platform as UploadPlatform,
    title: row.title,
    description: row.description,
    tags: row.tags,
    coverPath: row.cover_path,
    videoId: row.video_id,
    videoUrl: row.video_url,
    status: row.status as UploadStatus,
    errorMessage: row.error_message,
    uploadedAt: row.uploaded_at ?? '',
  }
}