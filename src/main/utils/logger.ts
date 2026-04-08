import log from 'electron-log'
import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { getLogsDir } from './paths'
import { join } from 'path'

// ==========================================
// 日志配置
// ==========================================

// 日志文件路径：复用已有的 getLogsDir()
log.transports.file.resolvePathFn = () => join(getLogsDir(), 'main.log')

// 文件最大 5MB，超过自动轮转
log.transports.file.maxSize = 5 * 1024 * 1024

// 日志格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'

// 生产环境控制台只显示 warn 以上
if (!process.env.ELECTRON_RENDERER_URL) {
  log.transports.console.level = 'warn'
}

export default log

// ==========================================
// IPC 日志包装器
// ==========================================

const MAX_ARG_LENGTH = 200

function truncateArg(arg: unknown): unknown {
  const str = typeof arg === 'string' ? arg : JSON.stringify(arg)
  if (!str) return arg
  if (str.length > MAX_ARG_LENGTH) {
    return str.substring(0, MAX_ARG_LENGTH) + `... (${str.length} chars)`
  }
  return arg
}

/**
 * 替代 ipcMain.handle，自动记录 IPC 调用的入参、返回值和错误
 */
export function handleWithLog(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    const start = Date.now()
    const truncatedArgs = args.map(truncateArg)

    log.debug(`[IPC -->] ${channel}`, truncatedArgs.length > 0 ? truncatedArgs : '(no args)')

    try {
      const result = await handler(event, ...args)
      const duration = Date.now() - start

      const resultStr = JSON.stringify(result)
      const loggedResult =
        resultStr && resultStr.length > MAX_ARG_LENGTH
          ? resultStr.substring(0, MAX_ARG_LENGTH) + '...'
          : result

      log.debug(`[IPC <--] ${channel} (${duration}ms)`, loggedResult)
      return result
    } catch (err) {
      const duration = Date.now() - start
      log.error(`[IPC ERR] ${channel} (${duration}ms)`, err)
      throw err
    }
  })
}

/** 获取当前日志文件路径 */
export function getLogFilePath(): string {
  return join(getLogsDir(), 'main.log')
}
