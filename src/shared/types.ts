// AIPC KTV - Shared Type Definitions

/**
 * Interface for the storage API exposed via Electron's contextBridge.
 * This defines the contract for renderer process to interact with main process storage.
 */
export interface StorageIPC {
  read: <T>(filename: string) => Promise<{ success: boolean; data?: T | null; error?: string }>;
  write: <T>(filename: string, data: T) => Promise<{ success: boolean; error?: string }>;
  exists: (filename: string) => Promise<{ success: boolean; exists?: boolean; error?: string }>;
  delete: (filename: string) => Promise<{ success: boolean; error?: string }>;
  ensureDirectory: (directory: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Interface for the YouTube Player API exposed via Electron's contextBridge.
 */
export interface YouTubePlayerIPC {
  openDisplayWindow: () => Promise<{ success: boolean; windowId?: number; error?: string }>;
  closeDisplayWindow: () => Promise<{ success: boolean; error?: string }>;
  control: (command: string, ...args: any[]) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Interface for the IPC Renderer API exposed via Electron's contextBridge.
 */
export interface IpcRendererIPC {
  on: (channel: string, listener: (...args: any[]) => void) => Electron.IpcRenderer;
  off: (channel: string, listener?: (...args: any[]) => void) => Electron.IpcRenderer;
  removeAllListeners: (channel: string) => Electron.IpcRenderer;
  sendMessage: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

/**
 * Combined Electron API exposed to the renderer process.
 */
export interface ElectronAPI {
  ipcRenderer: IpcRendererIPC;
  youtubePlayer: YouTubePlayerIPC;
  storage: StorageIPC;
}

/**
 * Song interface for queue and playlist management
 */
export interface Song {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number; // duration in seconds
}

/**
 * Playback state enumeration
 */
export enum PlaybackState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LOADING = 'loading',
  ERROR = 'error',
}

/**
 * Queue interface for managing playback queue
 */
export interface Queue {
  currentSong: Song | null;
  upcomingSongs: Song[];
  playbackState: PlaybackState;
}

/**
 * Playlist interface for managing user playlists
 */
export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: number; // timestamp in milliseconds
}

/**
 * YouTube player control messages for IPC communication
 */
export type YouTubePlayerCommand = 
  | 'play-video'
  | 'pause-video'
  | 'stop-video'
  | 'seek-to'
  | 'set-volume'
  | 'mute'
  | 'unmute'
  | 'get-player-state';

/**
 * YouTube player state information for comprehensive IPC communication
 */
export interface PlayerStateInfo {
  state: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  videoId?: string | null;
}

/**
 * YouTube Player state interface for IPC communication
 */
export interface YouTubePlayerState {
  state: number; // YouTube player state constant
  currentTime: number; // current playback time in seconds
  duration: number; // total video duration in seconds
}

/**
 * YouTube Player control actions
 */
export enum PlayerAction {
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
  LOAD = 'load',
}