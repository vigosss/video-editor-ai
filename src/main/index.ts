// 加载 .env.local 环境变量（平台凭证等）
import { config as dotenvConfig } from 'dotenv'
import { join } from 'path'
dotenvConfig({ path: join(__dirname, '../../.env.local') })

import { app, BrowserWindow, shell, ipcMain } from 'electron'

const is = {
  dev: !app.isPackaged,
}

const platform = {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
}

const electronApp = {
  setAppUserModelId(id: string) {
    if (platform.isWindows) {
      app.setAppUserModelId(is.dev ? process.execPath : id)
    }
  },
}

const optimizer = {
  watchWindowShortcuts(window: BrowserWindow) {
    if (!window) return
    const { webContents } = window
    webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        if (!is.dev) {
          if (input.code === 'KeyR' && (input.control || input.meta)) {
            event.preventDefault()
          }
        } else {
          if (input.code === 'F12') {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools()
            } else {
              webContents.openDevTools({ mode: 'undocked' })
            }
          }
        }
      }
    })
  },
}
import { initDatabase, closeDatabase } from './services/database'
import { initUpdater } from './services/updater'
import { registerAllIPC } from './ipc'
import { handleWithLog } from './utils/logger'

let mainWindow: BrowserWindow | null = null

function createSplashWindow(): BrowserWindow {
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发环境加载 dev server（splash hash 路由），生产环境加载打包文件
  if (is.dev) {
    const devServerUrl = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173'
    splashWindow.loadURL(`${devServerUrl}#/splash`)
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/splash' })
  }

  return splashWindow
}

function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // macOS 使用隐藏原生标题栏（保留红绿灯按钮），Windows/Linux 无边框
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    frame: false,
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 窗口控制 IPC
  handleWithLog('window:minimize', () => mainWindow?.minimize())
  handleWithLog('window:maximize', () => {
    if (!mainWindow) return
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  })
  handleWithLog('window:close', () => mainWindow?.close())
  handleWithLog('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  // 外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境加载 dev server，生产环境加载打包文件
  if (is.dev) {
    const devServerUrl = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  // 设置应用用户模型 ID（Windows）
  electronApp.setAppUserModelId('com.vigosss.video-editor-ai')

  // 初始化数据库
  initDatabase()

  // 注册所有 IPC 处理器
  registerAllIPC()

  // 创建 splash 窗口（先显示）
  const splashWindow = createSplashWindow()

  // 创建主窗口（隐藏，后台加载）
  createWindow()

  // 双标志协调：splash 完成 + 主窗口就绪 → 关闭 splash，显示主窗口
  let mainWindowReady = false
  let splashFinished = false

  function tryShowMainWindow() {
    if (mainWindowReady && splashFinished && mainWindow && splashWindow) {
      splashWindow.close()
      mainWindow.show()
    }
  }

  // 主窗口加载就绪
  mainWindow?.on('ready-to-show', () => {
    mainWindowReady = true
    tryShowMainWindow()
  })

  // splash 动画完成
  ipcMain.on('splash:finished', () => {
    splashFinished = true
    tryShowMainWindow()
  })

  // macOS 点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // 初始化自动更新服务
  if (mainWindow) {
    initUpdater(mainWindow)
    optimizer.watchWindowShortcuts(mainWindow)
  }
})

// 所有窗口关闭时退出应用（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 关闭数据库连接
    closeDatabase()
    app.quit()
  }
})

// 应用退出前关闭数据库
app.on('before-quit', () => {
  closeDatabase()
})