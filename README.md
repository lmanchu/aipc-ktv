# AIPC KTV

[![awesome-vite](https://awesome.re/mentioned-badge.svg)](https://github.com/vitejs/awesome-vite)
![GitHub stars](https://img.shields.io/github/stars/caoxiemeihao/vite-react-electron?color=fa6470)
![GitHub issues](https://img.shields.io/github/issues/caoxiemeihao/vite-react-electron?color=d8b22d)
![GitHub license](https://img.shields.io/github/license/caoxiemeihao/vite-react-electron)
[![Required Node.JS >= 14.18.0 || >=16.0.0](https://img.shields.io/static/v1?label=node&message=14.18.0%20||%20%3E=16.0.0&logo=node.js&color=3f893e)](https://nodejs.org/about/releases)

English | [简体中文](README.zh-CN.md)

## 👀 Overview

AIPC KTV is an open-source dual-screen karaoke application built with Electron, React, and YouTube IFrame API. It provides a professional KTV experience by leveraging dual-monitor setups: the primary screen serves as the song selection and queue management interface, while the external display shows the music video in fullscreen.

### Features

- 🎵 **YouTube Integration**: Search and play YouTube videos via IFrame API
- 🖥 **Dual-Screen Architecture**: Control window on primary screen, video player on external display
- 📝 **Queue Management**: Add, reorder, skip, and replay songs with drag-and-drop
- 📚 **Playlist System**: Create, save, and load playlists locally
- 💾 **File-Based Storage**: Persistent storage for playlists and queue data
- 🔄 **Auto-Update**: Built-in auto-update mechanism using electron-updater
- 🎨 **Modern UI**: Built with React 18, Vite, Tailwind CSS, and shadcn/ui components

## 🛫 Quick Setup

### Prerequisites

- **Node.js**: >= 14.18.0 || >= 16.0.0
- **npm**: >= 7.0.0
- **YouTube API Key**: Required for search functionality (see [YouTube API Setup](#youtube-api-setup))

### Installation

```bash
# clone the project
git clone https://github.com/your-username/aipc-ktv.git

# enter the project directory
cd aipc-ktv

# install dependency
npm install

# set up environment variables
cp .env.example .env
# Edit .env and add your YouTube API key

# develop
npm run dev
```

### Building for Production

See [BUILD.md](BUILD.md) for detailed build instructions for Windows, macOS, and Linux.

```bash
# Build for current platform
npm run dist

# Build for Windows
npm run dist:win

# Build for macOS
npm run dist:mac

# Build for Linux
npm run dist:linux
```

## 📂 Directory structure

Familiar React application structure, with Electron-related code separated:

```tree
├── electron/                         Electron-related code
│   ├── main/                         Main-process source code
│   │   ├── index.ts                  # App entry, dual-window setup
│   │   ├── storage.ts                # File-based storage service
│   │   └── update.ts                 # Auto-update handlers
│   └── preload/                      Preload-scripts source code
│       └── index.ts                  # IPC and API exposure
│
├── src/                              Renderer source code, your React application
│   ├── renderer/                     React UI components
│   │   ├── windows/
│   │   │   ├── control/              # PC screen - control interface
│   │   │   │   ├── SearchPanel.tsx
│   │   │   │   ├── QueuePanel.tsx
│   │   │   │   └── PlaylistPanel.tsx
│   │   │   └── display/              # External screen - video player
│   │   │       ├── VideoPlayer.tsx
│   │   │       └── SubtitleOverlay.tsx
│   │   ├── store/                    # Zustand stores
│   │   │   ├── queueStore.ts
│   │   │   ├── playlistStore.ts
│   │   │   └── preferenceStore.ts
│   │   └── services/                 # Storage services
│   │       ├── playlistStorage.ts
│   │       └── queueStorage.ts
│   └── shared/                       # Shared types
│       └── types.ts
│
├── release/                          Generated after production build
│   └── {version}/
│       ├── {os}-{os_arch}            # Contains unpacked application executable
│       └── {app_name}_{version}.{ext} # Installer for the application
│
├── docs/                             Documentation
│   ├── BUILD.md                      # Build guide
│   ├── PACKAGING.md                  # Packaging guide
│   └── TESTING.md                    # Testing guide
│
├── public/                           Static assets
├── electron-builder.yml              # Electron builder configuration
└── package.json
```

## 💾 File-Based Storage

AIPC KTV uses file-based storage for persistent data instead of in-memory Yjs storage. This ensures that playlists and queue data are saved to disk and restored on app restart.

### Storage Architecture

- **Main Process**: Storage service handles file I/O operations using Node.js `fs/promises` module
- **Data Location**: Platform-specific userData directory:
  - Windows: `%APPDATA%\aipc-ktv\`
  - macOS: `~/Library/Application Support/aipc-ktv/`
  - Linux: `~/.config/aipc-ktv/`
- **IPC Communication**: Storage operations exposed via Electron IPC to renderer process
- **State Management**: Zustand stores with manual file save on mutations

### Storage Services

- **Playlist Storage**: Automatically saves/loads playlists to `playlists.json`
- **Queue Storage**: Optional queue persistence (user can enable/disable via preferences)
- **Preference Store**: User preferences for app behavior

### Usage Example

```typescript
// In renderer process (via IPC)
const data = await window.electron.storage.read<MyType>('file.json')
await window.electron.storage.write('file.json', data)
```

## 📦 Packaging & Auto-Update

AIPC KTV supports packaging for Windows, macOS, and Linux with auto-update capability.

### Packaging

- **Windows**: NSIS installer (.exe) with x64 and ia32 support
- **macOS**: DMG disk image (.dmg) with Intel and Apple Silicon support
- **Linux**: AppImage and DEB package with x64 support

See [docs/PACKAGING.md](docs/PACKAGING.md) for detailed packaging configuration.

### Auto-Update

- **Mechanism**: electron-updater checks for updates on app launch
- **Update Provider**: Configurable (GitHub Releases, generic HTTP server, or custom)
- **User Control**: Users can manually check for updates and control download/install timing

See [docs/UPDATE.md](src/components/update/README.md) for auto-update configuration.

## 🔧 Additional features

1. electron-updater 👉 [see docs](src/components/update/README.md)
2. playwright

## ❔ FAQ

- [C/C++ addons, Node.js modules - Pre-Bundling](https://github.com/electron-vite/vite-plugin-electron-renderer#dependency-pre-bundling)
- [dependencies vs devDependencies](https://github.com/electron-vite/vite-plugin-electron-renderer#dependencies-vs-devdependencies)

## 📚 Documentation

- [BUILD.md](BUILD.md) - Build guide for Windows, macOS, and Linux
- [docs/PACKAGING.md](docs/PACKAGING.md) - Detailed packaging configuration
- [TESTING.md](TESTING.md) - Testing procedures and guidelines
- [PATLABOR_SPEC.md](PATLABOR_SPEC.md) - Project specification and milestones  

## 🛫 Quick Setup

```sh
# clone the project
git clone https://github.com/electron-vite/electron-vite-react.git

# enter the project directory
cd electron-vite-react

# install dependency
npm install

# develop
npm run dev
```

## 🐞 Debug

![electron-vite-react-debug.gif](/electron-vite-react-debug.gif)

## 📂 Directory structure

Familiar React application structure, just with `electron` folder on the top :wink:  
*Files in this folder will be separated from your React application and built into `dist-electron`*  

```tree
├── electron                                 Electron-related code
│   ├── main                                 Main-process source code
│   └── preload                              Preload-scripts source code
│
├── release                                  Generated after production build, contains executables
│   └── {version}
│       ├── {os}-{os_arch}                   Contains unpacked application executable
│       └── {app_name}_{version}.{ext}       Installer for the application
│
├── public                                   Static assets
└── src                                      Renderer source code, your React application
```

<!--
## 🚨 Be aware

This template integrates Node.js API to the renderer process by default. If you want to follow **Electron Security Concerns** you might want to disable this feature. You will have to expose needed API by yourself.  

To get started, remove the option as shown below. This will [modify the Vite configuration and disable this feature](https://github.com/electron-vite/vite-plugin-electron-renderer#config-presets-opinionated).

```diff
# vite.config.ts

export default {
  plugins: [
    ...
-   // Use Node.js API in the Renderer-process
-   renderer({
-     nodeIntegration: true,
-   }),
    ...
  ],
}
```
-->

## 🔧 Additional features

1. electron-updater 👉 [see docs](src/components/update/README.md)
1. playwright

## ❔ FAQ

- [C/C++ addons, Node.js modules - Pre-Bundling](https://github.com/electron-vite/vite-plugin-electron-renderer#dependency-pre-bundling)
- [dependencies vs devDependencies](https://github.com/electron-vite/vite-plugin-electron-renderer#dependencies-vs-devdependencies)
