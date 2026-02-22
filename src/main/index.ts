import { app, BrowserWindow, shell, ipcMain } from 'electron'
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
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
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

  displayWin = new BrowserWindow({
    title: 'AIPC KTV - Display',
    width: 1920,
    height: 1080,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
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
  if (process.platform !== 'darwin') app.quit()
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

// YouTube Player IPC Handlers
ipcMain.handle('open-display-window', async () => {
  try {
    const display = await createDisplayWindow()
    return { success: true, windowId: display.id }
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

ipcMain.handle('youtube-player-control', (_, command: string, ...args: any[]) => {
  if (!displayWin) {
    return { success: false, error: 'Display window not available' }
  }

  try {
    // Validate command and arguments
    switch (command) {
      case 'play-video':
        if (args[0] && typeof args[0] !== 'string') {
          return { success: false, error: 'Invalid video ID format' }
        }
        break
      case 'seek-to':
        if (typeof args[0] !== 'number' || args[0] < 0) {
          return { success: false, error: 'Seek time must be a non-negative number' }
        }
        break
      case 'set-volume':
        if (typeof args[0] !== 'number' || args[0] < 0 || args[0] > 100) {
          return { success: false, error: 'Volume must be between 0 and 100' }
        }
        break
    }

    displayWin.webContents.send('youtube-player-control', command, ...args)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
})

// Handle messages from display window back to control window
ipcMain.on('video-ended', () => {
  // Forward to main window
  if (win) {
    win.webContents.send('video-ended')
  }
})

ipcMain.on('player-state-response', (_, requestId: string, data: any) => {
  // Forward to main window with request ID for correlation
  if (win) {
    win.webContents.send('player-state-response', requestId, data)
  }
})

ipcMain.on('player-error', (_, error: any) => {
  // Forward player errors to main window
  if (win) {
    win.webContents.send('player-error', error)
  }
})

ipcMain.on('player-state-changed', (_, state: any) => {
  // Forward real-time state changes to main window
  if (win) {
    win.webContents.send('player-state-changed', state)
  }
})
