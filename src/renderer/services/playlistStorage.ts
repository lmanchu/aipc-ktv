import type { Playlist } from '../types'
import type { ElectronStorageAPI } from '../types/global'

interface PlaylistStorageError {
  message: string
  code?: string
}

export class PlaylistStorageService {
  private static instance: PlaylistStorageService | null = null
  private storage: ElectronStorageAPI | null = null
  private readonly PLAYLISTS_FILE = 'playlists.json'
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): PlaylistStorageService {
    if (!PlaylistStorageService.instance) {
      PlaylistStorageService.instance = new PlaylistStorageService()
    }
    return PlaylistStorageService.instance
  }

  static resetInstance(): void {
    PlaylistStorageService.instance = null
  }

  private initialize(): void {
    if (typeof window !== 'undefined' && window.electron?.storage) {
      this.storage = window.electron.storage
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.storage) {
      throw new Error('Storage service not available. Are you running in Electron?')
    }
  }

  async load(): Promise<Playlist[]> {
    try {
      this.ensureInitialized()
      
      const result = await this.storage!.read<Playlist[]>(this.PLAYLISTS_FILE)
      
      if (!result.success) {
        console.error('Failed to load playlists:', result.error)
        return []
      }
      
      return result.data || []
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Error loading playlists:', message)
      return []
    }
  }

  async save(playlists: Playlist[]): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.storage!.write(this.PLAYLISTS_FILE, playlists)
      
      if (!result.success) {
        console.error('Failed to save playlists:', result.error)
        return false
      }
      
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Error saving playlists:', message)
      return false
    }
  }

  async exists(): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.storage!.exists(this.PLAYLISTS_FILE)
      return result.success && result.exists === true
    } catch (error) {
      console.error('Error checking playlists file existence:', error)
      return false
    }
  }

  getError(error: unknown): PlaylistStorageError {
    if (error instanceof Error) {
      return { message: error.message }
    }
    return { message: String(error) }
  }
}

export const playlistStorageService = PlaylistStorageService.getInstance()
