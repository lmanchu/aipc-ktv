import { app, BrowserWindow, shell, ipcMain, screen } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { update } from './update'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let displayWin: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')
const displayHtml = path.join(RENDERER_DIST, 'display.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'AIPC KTV - Control',
    width: 800,
    height: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(win)
}

async function createDisplayWindow() {
  if (displayWin) return displayWin

  // Get all displays
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()

  let displayConfig: {
    x?: number
    y?: number
    width: number
    height: number
    fullscreen?: boolean
  }

  if (displays.length > 1) {
    // Multi-monitor setup: find external display and go fullscreen
    const externalDisplay = displays.find(display => 
      display.bounds.x !== primaryDisplay.bounds.x || 
      display.bounds.y !== primaryDisplay.bounds.y
    )

    if (externalDisplay) {
      displayConfig = {
        x: externalDisplay.bounds.x,
        y: externalDisplay.bounds.y,
        width: externalDisplay.bounds.width,
        height: externalDisplay.bounds.height,
        fullscreen: true,
      }
    } else {
      // Fallback to fullscreen on primary if no external found
      displayConfig = {
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
        fullscreen: true,
      }
    }
  } else {
    // Single monitor setup: open windowed on primary display
    displayConfig = {
      width: 1280,
      height: 720,
    }
  }

  displayWin = new BrowserWindow({
    title: 'AIPC KTV - Display',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    ...displayConfig,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow YouTube iframe
    },
  })

  if (VITE_DEV_SERVER_URL) {
    displayWin.loadURL(`${VITE_DEV_SERVER_URL}display.html`)
    displayWin.webContents.openDevTools()
  } else {
    displayWin.loadFile(displayHtml)
  }

  displayWin.on('closed', () => {
    displayWin = null
  })

  return displayWin
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  displayWin = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Clean up all windows
  if (displayWin) {
    displayWin.close()
    displayWin = null
  }
  if (win) {
    win.close()
    win = null
  }
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// Dual Window Management IPC Handlers
ipcMain.handle('open-display-window', async () => {
  try {
    const display = await createDisplayWindow()
    const displays = screen.getAllDisplays()
    const isMultiMonitor = displays.length > 1
    
    return { 
      success: true, 
      windowId: display.id,
      isMultiMonitor,
      displayCount: displays.length
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
})

ipcMain.handle('close-display-window', () => {
  if (displayWin) {
    displayWin.close()
    displayWin = null
    return { success: true }
  }
  return { success: false, error: 'Display window not found' }
})

// Enhanced Player Control IPC with comprehensive command support
ipcMain.handle('youtube-player-control', (_, command: string, ...args: any[]) => {
  if (!displayWin) {
    return { success: false, error: 'Display window not available' }
  }

  const validCommands = [
    'play-video', 'pause-video', 'stop-video', 'seek-to', 
    'set-volume', 'mute', 'unmute', 'get-player-state',
    'load-video', 'queue-update', 'next-song'
  ]
  
  if (!validCommands.includes(command)) {
    return { success: false, error: `Invalid command: ${command}. Valid commands: ${validCommands.join(', ')}` }
  }

  try {
    displayWin.webContents.send('youtube-player-control', command, ...args)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
})

// Enhanced bidirectional message forwarding for real-time sync
ipcMain.on('video-ended', () => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('video-ended')
  }
})

ipcMain.on('player-state-changed', (_, stateData) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('player-state-changed', stateData)
  }
})

ipcMain.on('player-state-response', (_, data) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('player-state-response', data)
  }
})

ipcMain.on('playback-progress', (_, progressData) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('playback-progress', progressData)
  }
})

ipcMain.on('volume-changed', (_, volumeData) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('volume-changed', volumeData)
  }
})

ipcMain.on('queue-update-request', (_, queueData) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('queue-update-request', queueData)
  }
})

// Get display information for debugging/status
ipcMain.handle('get-display-info', () => {
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()
  return {
    displays: displays.map(d => ({
      id: d.id,
      bounds: d.bounds,
      size: d.size,
      scaleFactor: d.scaleFactor,
      primary: d === primaryDisplay
    })),
    displayWindowOpen: !!displayWin
  }
})
