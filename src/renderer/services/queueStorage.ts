import type { Queue } from '../types'
import type { ElectronStorageAPI } from '../types/global'

interface QueueStorageError {
  message: string
  code?: string
}

export class QueueStorageService {
  private static instance: QueueStorageService | null = null
  private storage: ElectronStorageAPI | null = null
  private readonly QUEUE_FILE = 'queue.json'
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): QueueStorageService {
    if (!QueueStorageService.instance) {
      QueueStorageService.instance = new QueueStorageService()
    }
    return QueueStorageService.instance
  }

  static resetInstance(): void {
    QueueStorageService.instance = null
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

  async load(): Promise<Queue | null> {
    try {
      this.ensureInitialized()
      
      const result = await this.storage!.read<Queue>(this.QUEUE_FILE)
      
      if (!result.success) {
        console.error('Failed to load queue:', result.error)
        return null
      }
      
      if (!result.data) {
        return null
      }

      return {
        currentSong: result.data.currentSong || null,
        upcomingSongs: result.data.upcomingSongs || [],
        playbackState: result.data.playbackState,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Error loading queue:', message)
      return null
    }
  }

  async save(queue: Queue): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.storage!.write(this.QUEUE_FILE, queue)
      
      if (!result.success) {
        console.error('Failed to save queue:', result.error)
        return false
      }
      
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Error saving queue:', message)
      return false
    }
  }

  async exists(): Promise<boolean> {
    this.ensureInitialized()
    
    try {
      const result = await this.storage!.exists(this.QUEUE_FILE)
      return result.success && result.exists === true
    } catch (error) {
      console.error('Error checking queue file existence:', error)
      return false
    }
  }

  getError(error: unknown): QueueStorageError {
    if (error instanceof Error) {
      return { message: error.message }
    }
    return { message: String(error) }
  }
}

export const queueStorageService = QueueStorageService.getInstance()
