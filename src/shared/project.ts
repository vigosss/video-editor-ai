// ==========================================
// 项目相关类型定义
// ==========================================

import type { AudioMode, TransitionType, BeatSyncMode } from './bgm'

/** 项目状态 */
export type ProjectStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** 分析模式 */
export type AnalysisMode = 'quick' | 'standard' | 'deep'

/** GLM 可选模型 */
export type GLMModel =
  | 'GLM-4.6V-FlashX'
  | 'GLM-5V-Turbo'
  | 'GLM-4.6V'
  | 'GLM-4.7-FlashX'

/** 处理步骤 */
export type ProcessingStep =
  | 'idle'
  | 'normalizing'    // 视频合并（多视频标准化+拼接）
  | 'parsing'        // 视频解析
  | 'extracting'     // 音频提取
  | 'transcribing'   // 语音转录（Whisper）
  | 'extracting_frames' // 关键帧抽取
  | 'detecting_beats' // 节拍检测（BGM）
  | 'analyzing'      // AI 分析（GLM）
  | 'clipping'       // 剪辑视频
  | 'embedding_subs' // 嵌入字幕
  | 'mixing_audio'   // 音频混音（BGM）
  | 'completed'      // 完成
  | 'failed'         // 失败

/** 项目 */
export interface Project {
  id: string
  name: string
  videoPath: string        // 工作视频路径（合并结果或单个原始视频）
  videoPaths: string[]     // 所有原始上传视频路径
  outputPath: string
  prompt: string
  model: GLMModel
  analysisMode: AnalysisMode
  needsSubtitles: boolean  // 是否需要字幕
  bgmTrackId: string | null          // BGM 曲目 ID
  audioMode: AudioMode               // 音频处理模式
  bgmVolume: number                  // BGM 音量 0.0-1.0
  originalAudioVolume: number        // 原始音频音量 0.0-1.0
  transitionType: TransitionType     // 转场效果类型
  transitionDuration: number         // 转场时长（秒）
  beatSyncMode: BeatSyncMode         // 节拍同步模式
  status: ProjectStatus
  progress: number        // 0-100
  currentStep: ProcessingStep
  errorMessage: string | null
  createdAt: string       // ISO date string
  completedAt: string | null
}

/** 创建项目参数 */
export interface CreateProjectParams {
  name: string
  videoPaths: string[]     // 所有上传视频路径
  outputPath: string
  prompt: string
  model: GLMModel
  analysisMode: AnalysisMode
  needsSubtitles: boolean  // 是否需要字幕
  bgmTrackId?: string | null
  audioMode?: AudioMode
  bgmVolume?: number
  originalAudioVolume?: number
  transitionType?: TransitionType
  transitionDuration?: number
  beatSyncMode?: BeatSyncMode
}