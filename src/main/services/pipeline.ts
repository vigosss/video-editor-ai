// ==========================================
// 处理管线服务 — 串联视频处理全流程
// ==========================================

import { BrowserWindow } from 'electron'
import { join, basename, extname } from 'path'
import { existsSync, readdirSync, unlinkSync, renameSync, statSync, copyFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/ipc'
import { PIPELINE_STEPS, getActiveSteps } from '../../shared/pipeline'
import type { PipelineProgress, PipelineStepConfig } from '../../shared/pipeline'
import type { Project, ProcessingStep } from '../../shared/project'

import { getProject, updateProjectStatus, updateProject, createClips, getClipsByProject, deleteClipsByProject } from './database'
import { getVideoInfo, extractAudio, extractFrames, clipVideo, mergeClips, mergeClipsWithTransitions, mixAudioStreams, embedSubtitles, getProjectWorkDir, normalizeAndConcat } from './ffmpeg'
import { transcribeAudio, isModelDownloaded } from './whisper'
import { analyzeVideo } from './glm'
import { getBeatsForTrack, alignClipsToBeats, segmentByBeats } from './beatDetection'
import { getBgmTrackPath } from './bgm'
import type { ClipParams } from './ffmpeg'
import type { AnalyzeVideoOptions } from './glm'
import type { BeatInfo } from '../../shared/bgm'
import { getAllSettings } from './database'

// ==========================================
// 类型定义
// ==========================================

/** 管线进度回调 */
export type PipelineProgressCallback = (progress: PipelineProgress) => void

// ==========================================
// 进度计算工具
// ==========================================

/** 计算步骤的总体进度范围（基于活跃步骤） */
function getStepOverallRange(stepIndex: number, activeSteps: PipelineStepConfig[]): { start: number; end: number } {
  const totalWeight = activeSteps.reduce((sum, s) => sum + s.weight, 0)
  let start = 0
  for (let i = 0; i < stepIndex; i++) {
    start += (activeSteps[i].weight / totalWeight) * 100
  }
  const end = start + (activeSteps[stepIndex].weight / totalWeight) * 100
  return { start: Math.round(start), end: Math.round(end) }
}

/** 计算某步骤内进度映射到总体进度（基于活跃步骤） */
function mapStepToOverall(stepIndex: number, stepProgress: number, activeSteps: PipelineStepConfig[]): number {
  const { start, end } = getStepOverallRange(stepIndex, activeSteps)
  return Math.round(start + (stepProgress / 100) * (end - start))
}

// ==========================================
// 主管线执行
// ==========================================

/**
 * 执行完整的视频处理管线
 * @param projectId 项目 ID
 * @param mainWindow BrowserWindow 实例（用于发送进度）
 * @param signal AbortSignal（用于取消）
 */
export async function runPipeline(
  projectId: string,
  mainWindow: BrowserWindow,
  signal: AbortSignal,
): Promise<void> {
  console.log(`[Pipeline] 开始处理项目: ${projectId}`)

  // 获取项目信息
  const project = getProject(projectId)
  if (!project) {
    throw new Error(`项目不存在: ${projectId}`)
  }

  if (project.status === 'processing') {
    throw new Error(`项目正在处理中: ${projectId}`)
  }

  // 获取设置
  const settings = getAllSettings()

  // 工作目录
  const workDir = getProjectWorkDir(projectId)
  const framesDir = join(workDir, 'frames')
  const clipsDir = join(workDir, 'clips')

  // 中间产物路径
  const audioPath = join(workDir, 'audio.wav')
  const srtPath = join(workDir, 'subtitles.srt')
  const mergedPath = join(workDir, 'merged.mp4')

  // 根据项目配置获取活跃步骤
  const needsSubtitles = project.needsSubtitles
  const activeSteps = getActiveSteps({
    needsSubtitles,
    bgmTrackId: project.bgmTrackId,
    beatSyncMode: project.beatSyncMode,
    audioMode: project.audioMode,
  })

  // 进度发送辅助函数（基于活跃步骤索引）
  const sendProgress = (stepKey: string, stepProgress: number, message: string) => {
    if (signal.aborted) return

    const stepIndex = activeSteps.findIndex(s => s.key === stepKey)
    if (stepIndex === -1) return  // 步骤不在活跃列表中，跳过

    const step = activeSteps[stepIndex]
    const overallProgress = mapStepToOverall(stepIndex, stepProgress, activeSteps)

    const progress: PipelineProgress = {
      step: step.key,
      progress: stepProgress,
      overallProgress,
      message,
    }

    // 发送到渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.VIDEO_PROGRESS, progress)
    }

    // 更新数据库
    updateProjectStatus(projectId, 'processing', step.key, overallProgress)

    console.log(`[Pipeline] [${step.label}] ${stepProgress}% (总体 ${overallProgress}%) - ${message}`)
  }

  // 检查是否已取消
  const checkCancelled = () => {
    if (signal.aborted) {
      throw new Error('处理已被用户取消')
    }
  }

  try {
    // 更新项目状态为处理中
    updateProjectStatus(projectId, 'processing', 'normalizing', 0)

    // ==========================================
    // 步骤: 视频合并（多视频时标准化+拼接）
    // ==========================================
    let workingVideoPath = project.videoPath  // 默认工作视频

    if (project.videoPaths && project.videoPaths.length > 1) {
      sendProgress('normalizing', 0, `正在合并 ${project.videoPaths.length} 个视频文件...`)
      checkCancelled()

      const normalizedDir = join(workDir, 'normalized')
      const concatResultPath = join(workDir, 'concat_input.mp4')
      workingVideoPath = await normalizeAndConcat(project.videoPaths, normalizedDir, concatResultPath)

      // 更新项目的工作视频路径
      updateProject(projectId, { videoPath: workingVideoPath })

      sendProgress('normalizing', 100, `视频合并完成 (${project.videoPaths.length} 个文件)`)
    } else {
      // 单视频，跳过合并步骤
      sendProgress('normalizing', 100, '单视频模式，跳过合并')
    }

    // 输出路径（多视频用项目名，单视频用原视频名）
    // 注意：project.name 在旧数据中可能包含路径分隔符，用 basename 确保只取文件名部分
    const outputName = project.videoPaths && project.videoPaths.length > 1
      ? `${basename(project.name)}_final.mp4`
      : `${basename(workingVideoPath, extname(workingVideoPath))}_final.mp4`
    const outputPath = join(project.outputPath, outputName)

    // ==========================================
    // 步骤: 视频解析
    // ==========================================
    sendProgress('parsing', 0, '正在解析视频信息...')
    checkCancelled()

    const videoInfo = await getVideoInfo(workingVideoPath)
    console.log(`[Pipeline] 视频信息: 时长=${videoInfo.duration}s, 分辨率=${videoInfo.width}x${videoInfo.height}, 帧率=${videoInfo.fps}`)

    sendProgress('parsing', 100, `视频解析完成 (时长: ${Math.round(videoInfo.duration)}秒)`)

    // ==========================================
    // 步骤: 音频提取 + 语音转录（仅需要字幕时执行）
    // ==========================================
    let subtitleText = ''

    if (needsSubtitles) {
      // 音频提取
      sendProgress('extracting', 0, '正在提取音频...')
      checkCancelled()

      const extractedAudioPath = await extractAudio(workingVideoPath, workDir)
      // 重命名为统一路径（extractAudio 生成的文件名可能不同）
      if (extractedAudioPath !== audioPath && existsSync(extractedAudioPath)) {
        if (existsSync(audioPath)) unlinkSync(audioPath)
        renameSync(extractedAudioPath, audioPath)
      }

      sendProgress('extracting', 100, '音频提取完成')

      // 语音转录 (Whisper)
      sendProgress('transcribing', 0, '正在准备语音转录...')
      checkCancelled()

      // 检查模型是否已下载
      const whisperModel = settings.whisperModel || 'base'
      if (!isModelDownloaded(whisperModel)) {
        sendProgress('transcribing', 5, `${whisperModel} 模型未下载，请先在设置中下载模型`)
        throw new Error(`Whisper ${whisperModel} 模型未下载，请先在设置页下载模型`)
      }

      const transcribeResult = await transcribeAudio(
        audioPath,
        whisperModel,
        srtPath,
        (progress, message) => {
          checkCancelled()
          sendProgress('transcribing', progress, message)
        },
      )

      subtitleText = transcribeResult.fullText
      sendProgress('transcribing', 100, `转录完成，共 ${transcribeResult.segments.length} 个段落`)
    }

    // ==========================================
    // 步骤: 关键帧抽取
    // ==========================================
    sendProgress('extracting_frames', 0, '正在抽取关键帧...')
    checkCancelled()

    // 根据分析模式确定抽帧间隔
    const frameIntervals: Record<string, number> = {
      quick: 5,
      standard: 3,
      deep: 2,
    }
    const interval = frameIntervals[project.analysisMode] || 3

    const framePaths = await extractFrames(workingVideoPath, framesDir, interval)

    sendProgress('extracting_frames', 100, `关键帧抽取完成，共 ${framePaths.length} 帧`)

    // ==========================================
    // 步骤: 节拍检测（仅 BGM + 节拍同步启用时执行）
    // ==========================================
    let beatInfo: BeatInfo | null = null

    if (project.bgmTrackId && project.beatSyncMode !== 'none') {
      sendProgress('detecting_beats', 0, '正在分析背景音乐节拍...')
      checkCancelled()

      try {
        beatInfo = await getBeatsForTrack(project.bgmTrackId)
        sendProgress('detecting_beats', 100, `节拍分析完成，检测到 ${beatInfo.timestamps.length} 个节拍，BPM: ${Math.round(beatInfo.bpm)}`)
      } catch (err) {
        console.warn(`[Pipeline] 节拍检测失败，跳过节拍同步: ${(err as Error).message}`)
        beatInfo = null
        sendProgress('detecting_beats', 100, '节拍检测失败，将跳过节拍同步')
      }
    }

    // ==========================================
    // 步骤: AI 分析 (GLM)
    // ==========================================
    sendProgress('analyzing', 0, '正在准备 AI 分析...')
    checkCancelled()

    // 检查 API Key
    if (!settings.glmApiKey) {
      throw new Error('未配置 GLM API Key，请在设置中填写')
    }

    // 根据节拍同步模式准备分析选项
    const analyzeOptions: AnalyzeVideoOptions = {
      framePaths,
      subtitleText,
      userPrompt: project.prompt,
      model: project.model,
      analysisMode: project.analysisMode,
      systemPrompt: settings.systemPrompt,
    }

    // ai_with_beats 模式：将节拍信息传给 AI
    if (project.beatSyncMode === 'ai_with_beats' && beatInfo) {
      analyzeOptions.beatTimestamps = beatInfo.timestamps
      analyzeOptions.beatSyncMode = 'ai_with_beats'
    }

    // beat_segment 模式：按节拍分段，提取每段代表帧
    if (project.beatSyncMode === 'beat_segment' && beatInfo) {
      analyzeOptions.beatTimestamps = beatInfo.timestamps
      analyzeOptions.beatSyncMode = 'beat_segment'
    }

    const analysisResult = await analyzeVideo(
      analyzeOptions,
      (progress, message) => {
        checkCancelled()
        sendProgress('analyzing', progress, message)
      },
    )

    if (analysisResult.clips.length === 0) {
      throw new Error('AI 分析完成但未返回有效的剪辑片段，请尝试调整 Prompt 或切换模型')
    }

    // 对齐片段时间到节拍（ai_then_align 模式）
    let finalClips = analysisResult.clips
    if (project.beatSyncMode === 'ai_then_align' && beatInfo) {
      const alignedClips = alignClipsToBeats(
        analysisResult.clips.map(c => ({ startTime: c.startTime, endTime: c.endTime })),
        beatInfo,
      )
      finalClips = analysisResult.clips.map((c, i) => ({
        ...c,
        startTime: alignedClips[i].startTime,
        endTime: alignedClips[i].endTime,
      }))
      console.log(`[Pipeline] 已将 ${finalClips.length} 个片段对齐到节拍`)
    }

    // 保存剪辑片段到数据库
    const existingClips = getClipsByProject(projectId)
    if (existingClips.length > 0) {
      deleteClipsByProject(projectId)
    }

    const clipRecords = createClips(
      projectId,
      finalClips.map((c) => ({
        startTime: c.startTime,
        endTime: c.endTime,
        reason: c.reason,
      })),
    )

    sendProgress('analyzing', 100, `AI 分析完成，共识别 ${clipRecords.length} 个片段`)

    // ==========================================
    // 步骤: 视频剪辑 + 合并
    // ==========================================
    sendProgress('clipping', 0, '正在剪辑视频...')
    checkCancelled()

    const clipParams: ClipParams[] = finalClips.map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      reason: c.reason,
    }))

    // 剪辑视频片段
    const clipPaths = await clipVideo(workingVideoPath, clipParams, clipsDir)

    sendProgress('clipping', 60, `已剪辑 ${clipPaths.length} 个片段，正在合并...`)

    // 合并片段（根据是否有转场效果选择不同方式）
    let mergedResult: string
    if (project.transitionType && project.transitionType !== 'none' && clipPaths.length > 1) {
      mergedResult = await mergeClipsWithTransitions(
        clipPaths,
        mergedPath,
        project.transitionType,
        project.transitionDuration,
      )
      sendProgress('clipping', 100, `视频剪辑与合并完成（${project.transitionType} 转场）`)
    } else {
      mergedResult = await mergeClips(clipPaths, mergedPath)
      sendProgress('clipping', 100, '视频剪辑与合并完成')
    }

    // ==========================================
    // 步骤: 字幕嵌入（仅需要字幕时执行）
    // ==========================================
    let videoBeforeAudioMix = mergedResult

    if (needsSubtitles) {
      sendProgress('embedding_subs', 0, '正在嵌入字幕...')
      checkCancelled()

      // 字幕嵌入的输出路径
      const subsOutputPath = join(workDir, 'with_subs.mp4')

      if (existsSync(srtPath)) {
        const srtStat = statSync(srtPath)
        if (srtStat.size > 0) {
          await embedSubtitles(mergedResult, srtPath, subsOutputPath)
          videoBeforeAudioMix = subsOutputPath
          sendProgress('embedding_subs', 100, '字幕嵌入完成')
        } else {
          sendProgress('embedding_subs', 100, '无字幕内容')
        }
      } else {
        sendProgress('embedding_subs', 100, '无字幕文件')
      }
    }

    // ==========================================
    // 步骤: 音频混音（仅 BGM 启用且非原始音频模式时执行）
    // ==========================================
    if (project.bgmTrackId && project.audioMode !== 'original') {
      sendProgress('mixing_audio', 0, '正在混合背景音乐...')
      checkCancelled()

      try {
        const bgmPath = getBgmTrackPath(project.bgmTrackId)
        await mixAudioStreams(videoBeforeAudioMix, bgmPath, outputPath, {
          mode: project.audioMode,
          bgmVolume: project.bgmVolume,
          originalVolume: project.originalAudioVolume,
          bgmLoop: true,
          bgmFadeIn: 1.0,
          bgmFadeOut: 1.0,
        })
        sendProgress('mixing_audio', 100, '音频混音完成')
      } catch (err) {
        console.warn(`[Pipeline] BGM 混音失败: ${(err as Error).message}`)
        // 混音失败时直接复制视频
        copyFileSync(videoBeforeAudioMix, outputPath)
        sendProgress('mixing_audio', 100, '音频混音失败，已跳过')
      }
    } else {
      // 不需要混音，直接复制为最终输出
      copyFileSync(videoBeforeAudioMix, outputPath)
    }

    // ==========================================
    // 完成
    // ==========================================

    // 更新项目状态为完成
    updateProjectStatus(projectId, 'completed', 'completed', 100)

    // 更新输出路径为最终视频的完整文件路径
    updateProject(projectId, { outputPath })

    console.log(`[Pipeline] 项目处理完成: ${projectId}, 输出: ${outputPath}`)

    // 发送完成进度
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.VIDEO_PROGRESS, {
        step: 'completed',
        progress: 100,
        overallProgress: 100,
        message: '视频处理完成！',
      } as PipelineProgress)
    }

  } catch (err) {
    const errorMessage = (err as Error).message

    // 如果是用户取消，状态设为 failed
    const isCancelled = signal.aborted || errorMessage.includes('取消')
    const finalMessage = isCancelled ? '处理已被用户取消' : errorMessage

    // 更新项目状态为失败
    updateProjectStatus(projectId, 'failed', 'failed', 0, finalMessage)

    console.error(`[Pipeline] 项目处理失败: ${projectId}`, finalMessage)

    // 发送失败进度
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.VIDEO_PROGRESS, {
        step: 'failed',
        progress: 0,
        overallProgress: 0,
        message: finalMessage,
      } as PipelineProgress)
    }

    throw err
  } finally {
    // 清理工作目录中的临时文件（可选，保留中间产物以便调试）
    // 如需清理可在此处添加逻辑
  }
}
