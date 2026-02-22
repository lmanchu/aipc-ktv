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

// Dual window management
let controlWindow: BrowserWindow | null = null
let displayWindow: BrowserWindow | null = null

const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')
const displayHtml = path.join(RENDERER_DIST, 'display.html')

/**
 * Detects external monitors and returns display configuration
 */
function getDisplayConfiguration() {
  const displays = screen.getAllDisplays()
  const externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0
  })
  
  return {
    hasExternalDisplay: Boolean(externalDisplay),
    externalDisplay,
    primaryDisplay: screen.getPrimaryDisplay()
  }
}

/**
 * Creates the control window (800x600, resizable)
 */
async function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'AIPC KTV Control',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    resizable: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true
    },
  })

  if (VITE_DEV_SERVER_URL) {
    controlWindow.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    controlWindow.webContents.openDevTools()
  } else {
    controlWindow.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  controlWindow.webContents.on('did-finish-load', () => {
    controlWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  controlWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(controlWindow)
  
  return controlWindow
}

/**
 * Creates the display window (fullscreen on external monitor if available)
 */
async function createDisplayWindow() {
  const displayConfig = getDisplayConfiguration()
  
  let windowOptions: Electron.BrowserWindowConstructorOptions = {
    title: 'AIPC KTV Display',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    show: false, // Start hidden until positioned
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true
    },
  }

  if (displayConfig.hasExternalDisplay && displayConfig.externalDisplay) {
    // Fullscreen on external display
    windowOptions = {
      ...windowOptions,
      fullscreen: true,
      x: displayConfig.externalDisplay.bounds.x,
      y: displayConfig.externalDisplay.bounds.y,
      width: displayConfig.externalDisplay.bounds.width,
      height: displayConfig.externalDisplay.bounds.height
    }
  } else {
    // Windowed mode fallback (1280x720)
    windowOptions = {
      ...windowOptions,
      width: 1280,
      height: 720,
      resizable: true
    }
  }
  
  displayWindow = new BrowserWindow(windowOptions)

  if (VITE_DEV_SERVER_URL) {
    displayWindow.loadURL(`${VITE_DEV_SERVER_URL}display.html`)
  } else {
    displayWindow.loadFile(displayHtml)
  }

  // Show window after loading
  displayWindow.once('ready-to-show', () => {
    if (displayWindow) {
      displayWindow.show()
      
      // If no external display, don't steal focus from control window
      if (!displayConfig.hasExternalDisplay && controlWindow) {
        controlWindow.focus()
      }
    }
  })

  return displayWindow
}

/**
 * Creates both windows with proper dual-screen setup
 */
async function createWindows() {
  const displayConfig = getDisplayConfiguration()
  
  // Always create control window
  await createControlWindow()
  
  // Create display window 
  await createDisplayWindow()
  
  // If no external display, show control window prominently
  if (!displayConfig.hasExternalDisplay) {
    if (controlWindow) {
      controlWindow.focus()
    }
  }
  
  console.log(`Display configuration: ${displayConfig.hasExternalDisplay ? 'External display detected' : 'Single display mode'}`)
}

app.whenReady().then(createWindows)

app.on('window-all-closed', () => {
  controlWindow = null
  displayWindow = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  // Focus on the control window if the user tried to open another instance
  if (controlWindow) {
    if (controlWindow.isMinimized()) controlWindow.restore()
    controlWindow.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    if (controlWindow) {
      controlWindow.focus()
    } else {
      allWindows[0].focus()
    }
  } else {
    createWindows()
  }
})

// Display configuration IPC handlers
ipcMain.handle('get-display-config', () => {
  return getDisplayConfiguration()
})

ipcMain.handle('refresh-displays', async () => {
  // Close existing display window
  if (displayWindow) {
    displayWindow.close()
    displayWindow = null
  }
  
  // Recreate display window with new configuration
  await createDisplayWindow()
  return getDisplayConfiguration()
})

// Window management IPC handlers
ipcMain.handle('focus-control-window', () => {
  if (controlWindow) {
    controlWindow.focus()
    return true
  }
  return false
})

ipcMain.handle('focus-display-window', () => {
  if (displayWindow) {
    displayWindow.focus()
    return true
  }
  return false
})
