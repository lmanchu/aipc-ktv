import type { Playlist } from '../types'
import type { ElectronStorageAPI } from '../types/global'

export interface MigrationStatus {
  hasLocalStorageData: boolean
  hasFileData: boolean
  needsMigration: boolean
  migrated: boolean
  localStorageKey: string
}

export interface MigrationResult {
  success: boolean
  migrated: boolean
  message: string
  error?: string
}

export class StorageMigrationService {
  private static instance: StorageMigrationService | null = null
  private storage: ElectronStorageAPI | null = null
  private readonly LOCAL_STORAGE_KEY = 'playlist-store'
  private readonly PLAYLISTS_FILE = 'playlists.json'
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): StorageMigrationService {
    if (!StorageMigrationService.instance) {
      StorageMigrationService.instance = new StorageMigrationService()
    }
    return StorageMigrationService.instance
  }

  static resetInstance(): void {
    StorageMigrationService.instance = null
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

  private getLocalStorageData(): Playlist[] | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null
      }
      const data = localStorage.getItem(this.LOCAL_STORAGE_KEY)
      if (!data) {
        return null
      }
      const parsed = JSON.parse(data)
      return parsed.state?.playlists || null
    } catch (error) {
      console.error('Error reading localStorage:', error)
      return null
    }
  }

  private clearLocalStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.LOCAL_STORAGE_KEY)
        console.log('[Migration] LocalStorage cleared successfully')
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  private async saveToFileStorage(playlists: Playlist[]): Promise<boolean> {
    try {
      this.ensureInitialized()
      const result = await this.storage!.write(this.PLAYLISTS_FILE, playlists)
      if (result.success) {
        console.log('[Migration] Successfully saved playlists to file storage')
        return true
      } else {
        console.error('[Migration] Failed to save playlists to file storage:', result.error)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Migration] Error saving to file storage:', message)
      return false
    }
  }

  async checkMigrationStatus(): Promise<MigrationStatus> {
    console.log('[Migration] Checking migration status...')
    
    const localStorageData = this.getLocalStorageData()
    const hasLocalStorageData = localStorageData !== null && localStorageData.length > 0
    
    let hasFileData = false
    try {
      this.ensureInitialized()
      const result = await this.storage!.exists(this.PLAYLISTS_FILE)
      hasFileData = result.success && result.exists === true
    } catch (error) {
      console.error('[Migration] Error checking file existence:', error)
    }

    const needsMigration = hasLocalStorageData && !hasFileData
    
    console.log('[Migration] Status:', {
      hasLocalStorageData,
      hasFileData,
      needsMigration,
    })

    return {
      hasLocalStorageData,
      hasFileData,
      needsMigration,
      migrated: false,
      localStorageKey: this.LOCAL_STORAGE_KEY,
    }
  }

  async migrate(): Promise<MigrationResult> {
    console.log('[Migration] Starting migration...')
    
    try {
      const status = await this.checkMigrationStatus()
      
      if (!status.needsMigration) {
        if (status.hasFileData) {
          return {
            success: true,
            migrated: false,
            message: 'No migration needed. File storage already exists.',
          }
        }
        return {
          success: true,
          migrated: false,
          message: 'No migration needed. No existing data found.',
        }
      }

      const localStorageData = this.getLocalStorageData()
      
      if (!localStorageData || localStorageData.length === 0) {
        return {
          success: true,
          migrated: false,
          message: 'No data found in localStorage to migrate.',
        }
      }

      console.log(`[Migration] Found ${localStorageData.length} playlists in localStorage`)
      
      const saved = await this.saveToFileStorage(localStorageData)
      
      if (!saved) {
        return {
          success: false,
          migrated: false,
          message: 'Failed to save playlists to file storage.',
          error: 'File storage write failed',
        }
      }

      this.clearLocalStorage()
      
      console.log('[Migration] Migration completed successfully')
      
      return {
        success: true,
        migrated: true,
        message: `Successfully migrated ${localStorageData.length} playlists from localStorage to file storage.`,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Migration] Error during migration:', message)
      return {
        success: false,
        migrated: false,
        message: 'Migration failed due to an error.',
        error: message,
      }
    }
  }

  getLocalStorageKey(): string {
    return this.LOCAL_STORAGE_KEY
  }
}

export const storageMigrationService = StorageMigrationService.getInstance()
