// ==========================================
// BGM 背景音乐 IPC 处理器
// ==========================================

import { IPC_CHANNELS } from '../../shared/ipc'
import { listBgmTracks, getBgmTrackPath } from '../services/bgm'
import { getBeatsForTrack } from '../services/beatDetection'
import { handleWithLog } from '../utils/logger'

/** 注册 BGM 相关 IPC 处理器 */
export function registerBgmIPC(): void {
  // 列出所有 BGM 曲目
  handleWithLog(IPC_CHANNELS.BGM_LIST_TRACKS, async () => {
    return listBgmTracks()
  })

  // 获取 BGM 曲目文件路径
  handleWithLog(IPC_CHANNELS.BGM_GET_TRACK_PATH, async (_event, trackId: string) => {
    return getBgmTrackPath(trackId)
  })

  // 分析 BGM 曲目节拍
  handleWithLog(IPC_CHANNELS.BGM_ANALYZE_BEATS, async (_event, trackId: string) => {
    return getBeatsForTrack(trackId)
  })
}
