// ==========================================
// IPC 通道常量定义
// ==========================================

/** IPC 通道常量 */
export const IPC_CHANNELS = {
  // 项目
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',
  PROJECT_DELETE: 'project:delete',
  PROJECT_UPDATE: 'project:update',
  PROJECT_GET_CLIPS: 'project:getClips',

  // 视频处理
  VIDEO_GET_INFO: 'video:getInfo',
  VIDEO_START_PROCESS: 'video:startProcess',
  VIDEO_CANCEL_PROCESS: 'video:cancelProcess',
  VIDEO_PROGRESS: 'video:progress',
  VIDEO_EXTRACT_AUDIO: 'video:extractAudio',
  VIDEO_EXTRACT_FRAMES: 'video:extractFrames',
  VIDEO_CLIP: 'video:clip',
  VIDEO_MERGE: 'video:merge',
  VIDEO_EMBED_SUBTITLES: 'video:embedSubtitles',
  VIDEO_CHECK_FFMPEG: 'video:checkFfmpeg',

  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // 上传
  UPLOAD_START: 'upload:start',
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_CANCEL: 'upload:cancel',
  UPLOAD_GET_RECORDS: 'upload:getRecords',
  UPLOAD_CHECK_AUTH: 'upload:checkAuth',
  UPLOAD_AUTHORIZE: 'upload:authorize',
  UPLOAD_REVOKE: 'upload:revoke',
  UPLOAD_RETRY: 'upload:retry',

  // Prompt 模板
  TEMPLATE_LIST: 'template:list',
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',

  // Whisper 语音识别
  WHISPER_TRANSCRIBE: 'whisper:transcribe',
  WHISPER_DOWNLOAD_MODEL: 'whisper:downloadModel',
  WHISPER_GET_MODELS: 'whisper:getModels',
  WHISPER_DELETE_MODEL: 'whisper:deleteModel',
  WHISPER_PROGRESS: 'whisper:progress',

  // GLM 分析
  GLM_ANALYZE: 'glm:analyze',
  GLM_VALIDATE_KEY: 'glm:validateKey',
  GLM_PROGRESS: 'glm:progress',

  // 对话框
  DIALOG_OPEN_FILE: 'dialog:openFile',
  DIALOG_OPEN_FILES: 'dialog:openFiles',
  DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',

  // 系统
  SHELL_OPEN_PATH: 'shell:openPath',

  // 窗口控制
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
} as const
