// Global type definitions for DisplayApp and YouTube Player

// YouTube IFrame Player API types
export interface YouTubePlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead?: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  loadVideoById(videoId: string): void
  cueVideoById(videoId: string): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  setVolume(volume: number): void
  getVolume(): number
  destroy(): void
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer
  data?: number
}

// YouTube Player States
export enum YouTubePlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5,
}

// YouTube API globals
export interface YouTubeAPI {
  Player: new (elementId: string | HTMLElement, config: any) => YouTubePlayer
  PlayerState: typeof YouTubePlayerState
}

// Electron APIs for renderer process
export interface ElectronIpcRenderer {
  on: (channel: string, listener: (...args: any[]) => void) => void
  off: (channel: string, listener?: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
  sendMessage: (channel: string, ...args: any[]) => void
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

export interface ElectronYouTubePlayerAPI {
  openDisplayWindow: () => Promise<{ success: boolean; windowId?: number; error?: string }>
  closeDisplayWindow: () => Promise<{ success: boolean; error?: string }>
  control: (command: string, ...args: any[]) => Promise<{ success: boolean; error?: string }>
}

export interface ElectronStorageAPI {
  read<T = any>(filename: string): Promise<{ success: boolean; data?: T | null; error?: string }>
  write<T = any>(filename: string, data: T): Promise<{ success: boolean; error?: string }>
  exists(filename: string): Promise<{ success: boolean; exists?: boolean; error?: string }>
  delete(filename: string): Promise<{ success: boolean; error?: string }>
  ensureDirectory(directory: string): Promise<{ success: boolean; error?: string }>
}

export interface ElectronAPI {
  ipcRenderer: ElectronIpcRenderer
  youtubePlayer: ElectronYouTubePlayerAPI
  storage: ElectronStorageAPI
}

// Global window extensions
declare global {
  interface Window {
    YT?: YouTubeAPI
    onYouTubeIframeAPIReady?: () => void
    electron?: ElectronAPI
  }
}