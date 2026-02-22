// AIPC KTV - Shared Type Definitions

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
 * YouTube player state information
 */
export interface PlayerStateInfo {
  state: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
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