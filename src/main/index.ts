// 加载 .env.local 环境变量（平台凭证等）
import { config as dotenvConfig } from 'dotenv'
import { join } from 'path'
dotenvConfig({ path: join(__dirname, '../../.env.local') })

import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './services/database'
import { initUpdater } from './services/updater'
import { registerAllIPC } from './ipc'

function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // macOS 使用隐藏原生标题栏（保留红绿灯按钮），Windows/Linux 无边框
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    frame: !isMac,
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 窗口控制 IPC
  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow.close())
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized())

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

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

  // macOS 点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // 创建主窗口
  const mainWindow = createWindow()

  // 初始化自动更新服务
  initUpdater(mainWindow)

  // 默认按 Ctrl/Cmd + W 关闭窗口
  optimizer.watchWindowShortcuts(mainWindow)
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