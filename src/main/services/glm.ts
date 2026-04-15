// ==========================================
// GLM API 服务 — 智谱 AI 视觉分析
// ==========================================

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { getAllSettings } from './database'
import { GLM_MODEL_ID_MAP, DEFAULT_SYSTEM_PROMPT, MODEL_LABEL_MAP } from '../../shared/constants'
import type { GLMModel, AnalysisMode } from '../../shared/project'
import type { BeatSyncMode } from '../../shared/bgm'

// ==========================================
// 类型定义
// ==========================================

/** GLM 分析结果片段 */
export interface GLMClipSegment {
  startTime: number  // 秒
  endTime: number    // 秒
  reason: string     // 保留理由
}

/** GLM 分析结果 */
export interface GLMAnalysisResult {
  clips: GLMClipSegment[]
  rawResponse: string  // 原始响应文本
  reasoningContent?: string  // AI 思考过程（reasoning_content）
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/** GLM API 错误 */
export class GLMError extends Error {
  code: string
  statusCode?: number
  retryable: boolean
  headers?: Record<string, string>

  constructor(message: string, code: string, statusCode?: number, retryable = false, headers?: Record<string, string>) {
    super(message)
    this.name = 'GLMError'
    this.code = code
    this.statusCode = statusCode
    this.retryable = retryable
    this.headers = headers
  }
}

/** 进度回调类型 */
export type GLMProgressCallback = (progress: number, message: string, extra?: { thinkingContent?: string }) => void

// ==========================================
// 常量
// ==========================================

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const REQUEST_TIMEOUT = 120_000 // 120 秒超时
const MAX_RETRIES = 3
const MAX_COMPLETION_TOKENS = 8192


// ==========================================
// API 调用
// ==========================================

/**
 * 调用 GLM API（底层 HTTP 请求）
 */
async function callGLMApi(
  apiKey: string,
  modelId: string,
  messages: Array<Record<string, unknown>>,
  signal?: AbortSignal,
): Promise<{
  content: string
  reasoningContent?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  const body = {
    model: modelId,
    messages,
    temperature: 0.7,
    max_tokens: MAX_COMPLETION_TOKENS,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  // 合并外部 signal 和超时 signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  let response: Response
  try {
    response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if ((err as Error).name === 'AbortError') {
      throw new GLMError('请求超时或已取消', 'TIMEOUT', undefined, true)
    }
    throw new GLMError(`网络请求失败: ${(err as Error).message}`, 'NETWORK_ERROR', undefined, true)
  }

  clearTimeout(timeoutId)

  // 处理 HTTP 错误
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    switch (response.status) {
      case 401:
        throw new GLMError('API Key 无效或已过期，请在设置中检查', 'INVALID_API_KEY', 401, false)
      case 429:
        throw new GLMError('API 调用频率超限，请稍后重试', 'RATE_LIMITED', 429, true, Object.fromEntries(response.headers.entries()))
      case 400: {
        try {
          const errorJson = JSON.parse(errorText)
          const msg = errorJson?.error?.message || errorText
          throw new GLMError(`请求参数错误: ${msg}`, 'BAD_REQUEST', 400, false)
        } catch (e) {
          if (e instanceof GLMError) throw e
          throw new GLMError(`请求参数错误: ${errorText}`, 'BAD_REQUEST', 400, false)
        }
      }
      case 402:
        throw new GLMError('API 余额不足，请充值后继续使用', 'INSUFFICIENT_BALANCE', 402, false)
      case 500:
      case 502:
      case 503:
        throw new GLMError(`服务端错误 (${response.status})，请稍后重试`, 'SERVER_ERROR', response.status, true)
      default:
        throw new GLMError(`HTTP 错误 ${response.status}: ${errorText}`, 'HTTP_ERROR', response.status, false)
    }
  }

  // 解析响应
  try {
    const data = await response.json()
    const choice = data?.choices?.[0]
    const rawContent = choice?.message?.content

    // 处理 content 为数组的情况（部分模型返回 [{type:"text", text:"..."}]）
    let content: string | null = null
    if (typeof rawContent === 'string' && rawContent.length > 0) {
      content = rawContent
    } else if (Array.isArray(rawContent)) {
      content = rawContent
        .filter((part: Record<string, unknown>) => part.type === 'text' && part.text)
        .map((part: Record<string, unknown>) => part.text)
        .join('\n')
    }

    if (!content) {
      // 记录完整响应以便诊断
      console.error('[老兵AI] API 返回了空 content，完整响应:')
      console.error(JSON.stringify(data, null, 2))

      const finishReason = choice?.finish_reason
      const retryable = finishReason === 'length' || finishReason === 'content_filter'

      // 针对 finish_reason: length 提供更友好的错误提示
      let errorMsg = 'API 返回数据格式异常：content 为空'
      if (finishReason === 'length') {
        errorMsg = '老兵AI 思考过程过长，导致输出 token 耗尽未生成最终结果。请尝试简化 Prompt 或切换模型后重试。'
      } else if (finishReason === 'content_filter') {
        errorMsg = '老兵AI 响应被内容安全过滤器拦截，请尝试调整 Prompt 内容后重试。'
      } else if (finishReason) {
        errorMsg = `API 返回数据异常 (finish_reason: ${finishReason})`
      }

      throw new GLMError(errorMsg, 'INVALID_RESPONSE', undefined, retryable)
    }

    // 提取推理/思考内容（reasoning_content）
    const reasoningContent = choice?.message?.reasoning_content
      ? String(choice.message.reasoning_content)
      : undefined

    if (reasoningContent) {
      console.log(`[老兵AI] 思考过程: ${reasoningContent.substring(0, 200)}...`)
    }

    return {
      content,
      reasoningContent,
      usage: data?.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens ?? 0,
            completion_tokens: data.usage.completion_tokens ?? 0,
            total_tokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    }
  } catch (err) {
    if (err instanceof GLMError) throw err
    throw new GLMError(`解析 API 响应失败: ${(err as Error).message}`, 'PARSE_ERROR', undefined, false)
  }
}

// ==========================================
// 带重试的 API 调用
// ==========================================

/**
 * 带指数退避重试的 API 调用
 */
async function callWithRetry(
  apiKey: string,
  modelId: string,
  messages: Array<Record<string, unknown>>,
  onRetry?: (attempt: number, error: GLMError) => void,
  signal?: AbortSignal,
): Promise<{
  content: string
  reasoningContent?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  let lastError: GLMError | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGLMApi(apiKey, modelId, messages, signal)
    } catch (err) {
      lastError = err as GLMError

      // 不可重试的错误直接抛出
      if (!lastError.retryable || attempt === MAX_RETRIES) {
        throw lastError
      }

      // 根据错误类型计算退避时间
      let delay: number
      if (lastError.statusCode === 429) {
        // 429: 优先使用 Retry-After 头，否则使用长退避 (10s, 20s, 40s)
        const retryAfter = lastError.headers?.['retry-after']
        if (retryAfter) {
          const parsed = Number(retryAfter)
          delay = !isNaN(parsed) && parsed > 0 ? parsed * 1000 : Math.pow(2, attempt) * 10_000
        } else {
          delay = Math.pow(2, attempt) * 10_000
        }
      } else {
        // 其他可重试错误 (超时/服务端错误): 2s, 4s, 8s
        delay = Math.pow(2, attempt + 1) * 1000
      }

      // 添加随机抖动 (±25%)，避免多个请求同时重试
      delay = Math.round(delay * (0.75 + Math.random() * 0.5))

      console.warn(
        `[老兵AI] 请求失败 (尝试 ${attempt + 1}/${MAX_RETRIES + 1})，${(delay / 1000).toFixed(1)}s 后重试: ${lastError.message}`,
      )
      onRetry?.(attempt + 1, lastError)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// ==========================================
// 响应解析
// ==========================================

/**
 * 从 AI 响应文本中解析出 JSON 时间段列表
 * 支持多种格式容错：
 * 1. 标准 JSON
 * 2. Markdown 代码块包裹的 JSON
 * 3. 文本中嵌入的 JSON 数组
 */
function parseClipsFromResponse(text: string): GLMClipSegment[] {
  // 策略1: 直接解析整个响应为 JSON
  try {
    const parsed = JSON.parse(text.trim())
    return extractClipsFromObject(parsed)
  } catch {
    // 继续尝试其他策略
  }

  // 策略2: 从 Markdown 代码块中提取 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      return extractClipsFromObject(parsed)
    } catch {
      // 继续
    }
  }

  // 策略3: 用正则匹配 JSON 对象（包含 clips 数组）
  const jsonMatch = text.match(/\{[\s\S]*?"clips"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return extractClipsFromObject(parsed)
    } catch {
      // 继续
    }
  }

  // 策略4: 用正则匹配 JSON 数组（直接是片段数组）
  const arrayMatch = text.match(/\[[\s\S]*?\{[\s\S]*?"startTime"[\s\S]*?\}[\s\S]*?\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) {
        return extractClipsFromArray(parsed)
      }
    } catch {
      // 继续
    }
  }

  // 策略5: 用正则逐个匹配时间段
  return extractClipsByRegex(text)
}

/** 从 JSON 对象中提取 clips */
function extractClipsFromObject(obj: unknown): GLMClipSegment[] {
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    if (Array.isArray(o.clips)) {
      return extractClipsFromArray(o.clips)
    }
    if (Array.isArray(o.segments)) {
      return extractClipsFromArray(o.segments)
    }
  }
  return []
}

/** 从数组中提取标准化的片段 */
function extractClipsFromArray(arr: unknown[]): GLMClipSegment[] {
  return arr
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const o = item as Record<string, unknown>
      return {
        startTime: Number(o.startTime ?? o.start_time ?? o.start ?? 0),
        endTime: Number(o.endTime ?? o.end_time ?? o.end ?? 0),
        reason: String(o.reason ?? o.description ?? o.why ?? 'AI 推荐片段'),
      }
    })
    .filter((clip) => clip.endTime > clip.startTime && clip.startTime >= 0)
    // .sort((a, b) => a.startTime - b.startTime)
}

/** 用正则从文本中提取时间段（最后兜底） */
function extractClipsByRegex(text: string): GLMClipSegment[] {
  const clips: GLMClipSegment[] = []

  const timePatterns = [
    // startTime: X, endTime: Y
    // eslint-disable-next-line max-len
    /(?:(?:startTime|start_time|start)\s*[:=]\s*)(\d+\.?\d*)[\s,;]*?(?:(?:endTime|end_time|end)\s*[:=]\s*)(\d+\.?\d*)/gi,
    // X - Y 格式
    /(\d+\.?\d*)\s*[-~到至]\s*(\d+\.?\d*)\s*(?:秒|s)?/g,
  ]

  for (const pattern of timePatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const startTime = parseFloat(match[1])
      const endTime = parseFloat(match[2])
      if (endTime > startTime && startTime >= 0) {
        clips.push({
          startTime,
          endTime,
          reason: 'AI 推荐片段',
        })
      }
    }
  }

  return clips.sort((a, b) => a.startTime - b.startTime)
}

// ==========================================
// 读取关键帧图片为 base64
// ==========================================

/**
 * 读取关键帧图片并转为 base64
 */
async function readFramesAsBase64(
  framePaths: string[],
  limit: number,
  onProgress?: GLMProgressCallback,
): Promise<string[]> {
  const selectedPaths = selectFramesEvenly(framePaths, limit)
  const base64Images: string[] = []

  for (let i = 0; i < selectedPaths.length; i++) {
    if (!existsSync(selectedPaths[i])) {
      console.warn(`[老兵AI] 帧图片不存在，跳过: ${selectedPaths[i]}`)
      continue
    }

    const buffer = await readFile(selectedPaths[i])
    const base64 = buffer.toString('base64')
    base64Images.push(base64)

    onProgress?.(
      Math.round(((i + 1) / selectedPaths.length) * 30),
      `正在读取关键帧 (${i + 1}/${selectedPaths.length})...`,
    )
  }

  return base64Images
}

/** 均匀选取指定数量的帧 */
function selectFramesEvenly(paths: string[], limit: number): string[] {
  if (paths.length <= limit) return paths

  const step = (paths.length - 1) / (limit - 1)
  const selected: string[] = []
  for (let i = 0; i < limit; i++) {
    const index = Math.round(step * i)
    selected.push(paths[Math.min(index, paths.length - 1)])
  }
  return selected
}

// ==========================================
// 构造请求消息
// ==========================================

/** 构造多模态请求消息 */
function buildMessages(
  base64Images: string[],
  subtitleText: string,
  userPrompt: string,
  systemPrompt: string,
  beatTimestamps?: number[],
  beatSyncMode?: BeatSyncMode,
  frameTimestamps?: number[],
  videoDuration?: number,
  frameInterval?: number,
): Array<Record<string, unknown>> {
  const systemMessage = {
    role: 'system',
    content: systemPrompt,
  }

  const userContent: Array<Record<string, unknown>> = []

  // 添加视频元信息（总时长、帧间隔、帧数）
  if (videoDuration !== undefined || frameInterval !== undefined) {
    const metaLines: string[] = ['[视频元信息]']
    if (videoDuration !== undefined) {
      metaLines.push(`视频总时长：${videoDuration.toFixed(1)} 秒`)
    }
    if (frameInterval !== undefined) {
      metaLines.push(`帧抽取间隔：每 ${frameInterval} 秒 1 帧`)
    }
    metaLines.push(`本次发送关键帧数量：${base64Images.length} 帧`)
    if (frameTimestamps && frameTimestamps.length > 0) {
      metaLines.push(`帧时间戳范围：${frameTimestamps[0].toFixed(1)}s ~ ${frameTimestamps[frameTimestamps.length - 1].toFixed(1)}s`)
    }
    metaLines.push('')
    metaLines.push('重要：你看到的每张图片已标注其在原视频中的精确时间戳。输出的 startTime/endTime 必须基于图片标注的时间戳，不得自行估算。')
    userContent.push({
      type: 'text',
      text: metaLines.join('\n'),
    })
  }

  // 添加关键帧图片（每帧前紧贴时间戳文字标签）
  for (let i = 0; i < base64Images.length; i++) {
    // 在图片前插入时间戳标签（文字紧贴图片，确保注意力关联）
    if (frameTimestamps && frameTimestamps[i] !== undefined) {
      userContent.push({
        type: 'text',
        text: `[帧 ${String(i + 1).padStart(2, '0')} | 时间戳: ${frameTimestamps[i].toFixed(2)}s]`,
      })
    }
    userContent.push({
      type: 'image_url',
      image_url: {
        url: base64Images[i],
      },
    })
  }

  // 添加字幕文本
  if (subtitleText.trim()) {
    userContent.push({
      type: 'text',
      text: `以下是视频的字幕文本（SRT 格式）：\n\n${subtitleText}`,
    })
  }

  // 添加节拍信息（如果启用节拍同步）
  if (beatTimestamps && beatTimestamps.length > 0 && beatSyncMode) {
    const beatInfoText = buildBeatPrompt(beatTimestamps, beatSyncMode)
    userContent.push({
      type: 'text',
      text: beatInfoText,
    })
  }

  // 添加用户 Prompt
  userContent.push({
    type: 'text',
    text: userPrompt,
  })

  const userMessage = {
    role: 'user',
    content: userContent,
  }

  return [systemMessage, userMessage]
}

/** 根据节拍同步模式构建提示文本 */
function buildBeatPrompt(beatTimestamps: number[], mode: BeatSyncMode): string {
  // 限制显示的节拍数量，避免 prompt 过长
  const maxBeats = 200
  const beats = beatTimestamps.length > maxBeats
    ? beatTimestamps.filter((_, i) => i % Math.ceil(beatTimestamps.length / maxBeats) === 0)
    : beatTimestamps

  const beatsStr = beats.map(t => t.toFixed(2)).join(', ')

  if (mode === 'ai_with_beats') {
    return `以下是背景音乐的节拍时间点（单位：秒）：
[${beatsStr}]

请根据这些节拍点来规划剪辑片段：
1. 每个片段的 startTime 和 endTime 尽量落在某个节拍时间点上（误差不超过 0.3 秒）
2. 片段之间的切换位置应卡在节拍点上，增强视频节奏感
3. 保持画面内容连贯性的同时，让视频切换与音乐节奏同步
4. 片段时长可以根据音乐节奏灵活调整，不必使用全部原始素材时长
5. 在保证内容质量的前提下，可以让节奏更紧凑、更有动感`
  }

  if (mode === 'beat_segment') {
    return `以下是背景音乐的节拍时间点（单位：秒）：
[${beatsStr}]

我已经将视频按节拍分成了若干段落（通常每 4 个节拍为一段）。请评估每个段落的画面质量，并推荐保留哪些段落来组成最佳的视频：
1. 挑选出画面质量最好、内容最有价值的段落
2. 保留的段落总时长应适合短视频（建议 30 秒到 3 分钟）
3. 段落之间可以按节拍节奏调整，不必完全连续
4. 每个片段的 startTime 和 endTime 应与节拍时间点对齐`
  }

  // ai_then_align 不需要在这里处理
  return ''
}

// ==========================================
// 主入口：分析视频
// ==========================================

/** 分析视频选项 */
export interface AnalyzeVideoOptions {
  framePaths: string[]
  subtitleText: string
  userPrompt: string
  model: GLMModel
  analysisMode: AnalysisMode
  systemPrompt?: string
  apiKey?: string
  beatTimestamps?: number[]
  beatSyncMode?: BeatSyncMode
  frameTimestamps?: number[]   // 每帧对应的时间戳（秒）
  videoDuration?: number       // 视频总时长（秒）
  frameInterval?: number       // 帧抽取间隔（秒）
}

/** 发送给 AI 的最大帧数限制（避免注意力衰减） */
const MAX_FRAMES_FOR_AI = 25

/**
 * 均匀选取指定数量的帧，返回选中的路径和对应的原始索引
 */
function selectFramesWithIndices(paths: string[], limit: number): { paths: string[]; indices: number[] } {
  if (paths.length <= limit) {
    return { paths, indices: paths.map((_, i) => i) }
  }

  const step = (paths.length - 1) / (limit - 1)
  const selectedPaths: string[] = []
  const selectedIndices: number[] = []
  for (let i = 0; i < limit; i++) {
    const index = Math.round(step * i)
    const clampedIndex = Math.min(index, paths.length - 1)
    selectedPaths.push(paths[clampedIndex])
    selectedIndices.push(clampedIndex)
  }
  return { paths: selectedPaths, indices: selectedIndices }
}

/**
 * 分析视频并返回剪辑片段
 */
export async function analyzeVideo(
  options: AnalyzeVideoOptions,
  onProgress?: GLMProgressCallback,
): Promise<GLMAnalysisResult> {
  const { framePaths, subtitleText, userPrompt, model, analysisMode } = options

  // 获取 API Key
  const settings = getAllSettings()
  const apiKey = options.apiKey || settings.glmApiKey
  if (!apiKey) {
    throw new GLMError('未配置 API Key，请在设置中填写', 'NO_API_KEY', undefined, false)
  }

  // 获取模型 API 标识
  const modelId = GLM_MODEL_ID_MAP[model]
  if (!modelId) {
    throw new GLMError(`不支持的模型: ${model}`, 'UNSUPPORTED_MODEL', undefined, false)
  }

  // 获取系统提示词
  const systemPrompt = options.systemPrompt || settings.systemPrompt || DEFAULT_SYSTEM_PROMPT

  console.log(`[GLM] 开始分析: 模型=${modelId}, 分析模式=${analysisMode}`)
  console.log(`[GLM] 关键帧数量: ${framePaths.length}`)

  // 步骤1: 均匀选取帧并限制数量（避免注意力衰减）
  const { paths: selectedPaths, indices: selectedIndices } = selectFramesWithIndices(framePaths, MAX_FRAMES_FOR_AI)
  console.log(`[GLM] 均匀选取 ${selectedPaths.length} 帧（原始 ${framePaths.length} 帧）`)

  // 根据选取的帧索引，计算对应的时间戳
  let selectedTimestamps: number[] | undefined
  if (options.frameTimestamps && options.frameTimestamps.length > 0) {
    // 使用 pipeline 传入的精确时间戳
    selectedTimestamps = selectedIndices.map(i => options.frameTimestamps![i])
  } else if (options.frameInterval) {
    // 回退：根据帧间隔和索引计算时间戳
    selectedTimestamps = selectedIndices.map(i => i * options.frameInterval!)
  }

  onProgress?.(0, '正在读取关键帧图片...')
  const base64Images = await readFramesAsBase64(selectedPaths, selectedPaths.length, onProgress)

  if (base64Images.length === 0) {
    throw new GLMError('没有可用的关键帧图片', 'NO_FRAMES', undefined, false)
  }

  // 步骤2: 构造请求消息（传入帧时间戳和视频元信息）
  onProgress?.(30, '正在构造分析请求...')
  const messages = buildMessages(
    base64Images,
    subtitleText,
    userPrompt,
    systemPrompt,
    options.beatTimestamps,
    options.beatSyncMode,
    selectedTimestamps,
    options.videoDuration,
    options.frameInterval,
  )

  // 步骤3: 调用 API（带重试）
  onProgress?.(35, `正在调用 ${MODEL_LABEL_MAP[model]} 进行分析，请稍候...`);

  const result = await callWithRetry(apiKey, modelId, messages, (attempt, error) => {
    onProgress?.(35, `分析请求失败，第 ${attempt} 次重试中... (${error.message})`)
  })

  onProgress?.(80, '正在解析分析结果...', result.reasoningContent ? { thinkingContent: result.reasoningContent } : undefined)

  // 步骤4: 解析响应
  const clips = parseClipsFromResponse(result.content)

  if (clips.length === 0) {
    console.warn('[GLM] 未能从响应中解析出有效的剪辑片段')
    console.warn('[GLM] 原始响应:', result.content.substring(0, 500))
    throw new GLMError(
      'AI 未能返回有效的剪辑时间段。请尝试调整 Prompt 或切换模型后重试。',
      'NO_CLIPS_PARSED',
      undefined,
      false,
    )
  }

  onProgress?.(100, `分析完成，共识别 ${clips.length} 个推荐片段`)

  console.log(`[GLM] 分析完成: ${clips.length} 个片段`)
  console.log(`[GLM] 片段顺序:`, clips.map((c, i) => `${i+1}. ${c.startTime}s-${c.endTime}s ${c.reason.substring(0, 20)}`).join(' | '))

  // 强制按外观→内饰顺序重排（防止 AI 按时间戳排序）
  const EXTERIOR_LABELS = ['外观-正面', '外观-车头', '外观-车灯', '外观-车侧', '外观-车后侧', '外观-车尾', '外观-驾驶室']
  const INTERIOR_LABELS = ['内饰-卡座区', '内饰-厨房区', '内饰-床铺区', '内饰-卫生间']
  const getOrder = (reason: string) => {
    const extIdx = EXTERIOR_LABELS.findIndex(l => reason.includes(l))
    if (extIdx !== -1) return extIdx
    const intIdx = INTERIOR_LABELS.findIndex(l => reason.includes(l))
    if (intIdx !== -1) return EXTERIOR_LABELS.length + intIdx
    return EXTERIOR_LABELS.length + INTERIOR_LABELS.length
  }
  const sortedClips = [...clips].sort((a, b) => getOrder(a.reason) - getOrder(b.reason))
  console.log(`[GLM] 重排后顺序:`, sortedClips.map((c, i) => `${i+1}. ${c.startTime}s-${c.endTime}s ${c.reason.substring(0, 20)}`).join(' | '))

  return {
    clips: sortedClips,
    rawResponse: result.content,
    reasoningContent: result.reasoningContent,
    usage: result.usage
      ? {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        }
      : undefined,
  }
}

// ==========================================
// API Key 验证
// ==========================================

/**
 * 验证 API Key 是否有效
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim().length === 0) {
    return false
  }

  try {
    const body = {
      model: 'glm-4.6v-flash',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1,
    }

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })

    if (response.ok) return true
    if (response.status === 401) return false
    return response.status !== 401
  } catch (err) {
    console.warn('[老兵AI] API Key 验证失败:', (err as Error).message)
    return false
  }
}