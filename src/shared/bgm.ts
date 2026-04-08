// ==========================================
// BGM 背景音乐相关类型定义
// ==========================================

/** 音频模式 */
export type AudioMode = 'original' | 'bgm_only' | 'mixed'

/** 转场效果类型 */
export type TransitionType =
  | 'none'
  | 'fade'
  | 'fadeblack'
  | 'fadewhite'
  | 'dissolve'
  | 'wipeleft'
  | 'wiperight'
  | 'wipeup'
  | 'wipedown'
  | 'slideleft'
  | 'slideright'
  | 'slideup'
  | 'slidedown'
  | 'circlecrop'
  | 'circleopen'
  | 'circleclose'
  | 'radial'
  | 'smoothleft'
  | 'smoothright'
  | 'smoothup'
  | 'smoothdown'
  | 'horzopen'
  | 'horzclose'
  | 'vertopen'
  | 'vertclose'
  | 'diagtl'
  | 'diagtr'
  | 'diagbl'
  | 'diagbr'
  | 'hlslice'
  | 'hrslice'
  | 'vuslice'
  | 'vdslice'
  | 'pixelize'
  | 'squeezeh'
  | 'squeezev'
  | 'zoomin'

/** 节拍同步模式 */
export type BeatSyncMode = 'none' | 'ai_with_beats' | 'beat_segment' | 'ai_then_align'

/** BGM 曲目信息 */
export interface BGMTrack {
  id: string
  name: string
  filename: string
  duration: number
  bpm: number
  mood: 'upbeat' | 'calm' | 'dramatic' | 'neutral'
  category: string
}

/** 节拍分析结果 */
export interface BeatInfo {
  timestamps: number[]
  bpm: number
  confidence: number
}

/** 音频混音选项 */
export interface AudioMixOptions {
  mode: AudioMode
  bgmVolume: number
  originalVolume: number
  bgmLoop: boolean
  bgmFadeIn: number
  bgmFadeOut: number
}
