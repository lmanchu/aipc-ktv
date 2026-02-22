// YouTube Player Service - IPC communication with display window
import { YouTubePlayerState, PlayerAction } from '../../shared/types'

/**
 * YouTube Player Service for controlling the player in the display window via IPC
 */
export class YouTubePlayerService {
  private ipcRenderer: typeof window.ipcRenderer

  constructor() {
    this.ipcRenderer = window.ipcRenderer
  }

  /**
   * Play the current video
   */
  async play(): Promise<boolean> {
    try {
      return await this.ipcRenderer.invoke('player-play')
    } catch (error) {
      console.error('Failed to play video:', error)
      return false
    }
  }

  /**
   * Pause the current video
   */
  async pause(): Promise<boolean> {
    try {
      return await this.ipcRenderer.invoke('player-pause')
    } catch (error) {
      console.error('Failed to pause video:', error)
      return false
    }
  }

  /**
   * Stop the current video
   */
  async stop(): Promise<boolean> {
    try {
      return await this.ipcRenderer.invoke('player-stop')
    } catch (error) {
      console.error('Failed to stop video:', error)
      return false
    }
  }

  /**
   * Load a video by ID
   */
  async loadVideo(videoId: string): Promise<boolean> {
    try {
      return await this.ipcRenderer.invoke('player-load-video', videoId)
    } catch (error) {
      console.error('Failed to load video:', error)
      return false
    }
  }

  /**
   * Get current player state
   */
  async getPlayerState(): Promise<YouTubePlayerState | null> {
    try {
      return await this.ipcRenderer.invoke('player-get-state')
    } catch (error) {
      console.error('Failed to get player state:', error)
      return null
    }
  }

  /**
   * Execute a player action based on PlayerAction enum
   */
  async executeAction(action: PlayerAction, videoId?: string): Promise<boolean> {
    switch (action) {
      case PlayerAction.PLAY:
        return await this.play()
      case PlayerAction.PAUSE:
        return await this.pause()
      case PlayerAction.STOP:
        return await this.stop()
      case PlayerAction.LOAD:
        if (!videoId) {
          throw new Error('Video ID required for load action')
        }
        return await this.loadVideo(videoId)
      default:
        throw new Error(`Unknown player action: ${action}`)
    }
  }
}

// Singleton instance
export const youTubePlayerService = new YouTubePlayerService()