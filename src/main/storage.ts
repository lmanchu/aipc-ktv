import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'

export class StorageService {
  private userDataPath: string

  constructor() {
    this.userDataPath = app.getPath('userData')
  }

  private getFilePath(filename: string): string {
    return path.join(this.userDataPath, filename)
  }

  private getDirectoryPath(dir: string): string {
    return path.join(this.userDataPath, dir)
  }

  async read<T>(filename: string): Promise<T | null> {
    const filePath = this.getFilePath(filename)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content) as T
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException
      if (nodeError.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  async write<T>(filename: string, data: T): Promise<void> {
    const filePath = this.getFilePath(filename)
    const directory = path.dirname(filePath)
    await this.ensureDirectory(directory)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  async exists(filename: string): Promise<boolean> {
    const filePath = this.getFilePath(filename)
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async delete(filename: string): Promise<void> {
    const filePath = this.getFilePath(filename)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException
      if (nodeError.code === 'ENOENT') {
        return
      }
      throw error
    }
  }

  async ensureDirectory(dir: string): Promise<void> {
    const dirPath = this.getDirectoryPath(dir)
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  getUserDataPath(): string {
    return this.userDataPath
  }
}

let storageServiceInstance: StorageService | null = null

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService()
  }
  return storageServiceInstance
}

export function resetStorageService(): void {
  storageServiceInstance = null
}
