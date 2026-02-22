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
  STOPPED = 'stopped',
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