import path from 'path'
import fs from 'fs/promises'
import { constants } from 'fs'
import { randomBytes, createHash } from 'crypto'
import { fileTypeFromBuffer } from 'file-type'

// ============================================
// Types & Interfaces
// ============================================

export type DocumentType = 'GUIAENTRADA' | 'HOJAREMISION' | 'DOCUMENT'

export interface StorageConfig {
  rootPath: string
  provider: 'local' | 'azure-blob'
  maxSize: number
  allowedExtensions: string[]
}

export interface SaveFileOptions {
  entityType: DocumentType
  entityId: string
  file: File
  date?: Date
}

export interface SavedFileResult {
  success: boolean
  filePath?: string
  fileName?: string
  relativePath?: string
  fileHash?: string
  fileMimeType?: string
  error?: string
}

// ============================================
// Security: File Validation
// ============================================

/**
 * Sanitizes a filename to prevent path traversal attacks
 * Removes: .., /, \, null bytes, control characters
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[\\\/]/g, '')           // Remove path separators
    .replace(/\.\./g, '')              // Remove double dots
    .replace(/\0/g, '')                // Remove null bytes
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .replace(/[<>:"|?*]/g, '')         // Remove Windows invalid chars
    .trim()
}

/**
 * Validates file extension against allowed list
 */
export function validateFileExtension(
  fileName: string,
  allowedExtensions: string[]
): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext) return false
  return allowedExtensions.includes(ext)
}

/**
 * Validates file size against maximum allowed
 */
export function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize > 0 && fileSize <= maxSize
}

/**
 * Allowed MIME types for security validation
 * Based on real file content detection (magic bytes)
 */
export const ALLOWED_MIME_TYPES: Set<string> = new Set([
  // PDF
  'application/pdf',

  // Microsoft Office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX

  // Images
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/webp',
  'image/heif',
  'image/heic',

  // Text/HTML
  'text/plain',
  'text/html',
  'text/csv',

  // Others
  'application/rtf',
  'application/zip'
])

/**
 * Validates file content using magic bytes (real file type detection)
 * Returns the detected MIME type or throws an error if invalid
 */
export async function validateFileContent(buffer: Buffer): Promise<{
  mimeType: string
  extension: string
}> {
  try {
    // Read first 4100 bytes for file-type detection
    const sampleSize = Math.min(buffer.length, 4100)
    const uint8Array = new Uint8Array(buffer.subarray(0, sampleSize))

    // Detect file type from magic bytes
    const detection = await fileTypeFromBuffer(uint8Array)

    if (!detection) {
      throw new Error('Unable to detect file type from content')
    }

    // Validate MIME type is allowed
    if (!ALLOWED_MIME_TYPES.has(detection.mime)) {
      throw new Error(
        `File content type "${detection.mime}" is not allowed. ` +
        `Detected from extension: ${detection.ext}`
      )
    }

    console.log(`[FileStorage] Content validation passed: ${detection.mime} (.${detection.ext})`)

    return {
      mimeType: detection.mime,
      extension: detection.ext
    }
  } catch (error) {
    console.error('[FileStorage] Content validation failed:', error)
    throw error
  }
}

/**
 * Calculates SHA-256 hash of file content for integrity verification
 */
export function calculateFileHash(buffer: Buffer): string {
  const hash = createHash('sha256')
  hash.update(buffer)
  return hash.digest('hex')
}

/**
 * Generates unique ID component for filename
 */
export function generateUniqueId(): string {
  return randomBytes(6).toString('hex').substring(0, 8)
}

/**
 * Generates filename in required format: YYYYMMDD + TIPO + ID_UNIQUE
 * Example: 20250225GUIAENTRADA_abc123.pdf
 */
export function generateStorageFileName(
  entityType: DocumentType,
  entityId: string,
  fileExtension: string,
  date?: Date
): string {
  const fileDate = date || new Date()
  const year = fileDate.getFullYear()
  const month = String(fileDate.getMonth() + 1).padStart(2, '0')
  const day = String(fileDate.getDate()).padStart(2, '0')

  const datePart = `${year}${month}${day}`
  const uniqueId = entityId.substring(0, 8) // First 8 chars of entity ID

  return `${datePart}${entityType}_${uniqueId}.${fileExtension.toLowerCase()}`
}

// ============================================
// Path Generation
// ============================================

/**
 * Generates relative directory structure for organized storage
 * Format: {entityType}/{year}/{month}/
 * Example: GUIAENTRADA/2025/02/
 */
export function generateStoragePath(
  entityType: DocumentType,
  date?: Date
): string {
  const fileDate = date || new Date()
  const year = fileDate.getFullYear()
  const month = String(fileDate.getMonth() + 1).padStart(2, '0')

  return path.join(entityType, String(year), month)
}

/**
 * Generates complete relative path: directory/filename
 * Example: GUIAENTRADA/2025/02/20250225GUIAENTRADA_abc123.pdf
 */
export function generateRelativePath(
  entityType: DocumentType,
  entityId: string,
  fileExtension: string,
  date?: Date
): string {
  const directory = generateStoragePath(entityType, date)
  const fileName = generateStorageFileName(entityType, entityId, fileExtension, date)

  return path.join(directory, fileName)
}

// ============================================
// Main Storage Service Class
// ============================================

class FileStorageService {
  private config: StorageConfig
  private initialized: boolean = false

  constructor() {
    this.config = {
      rootPath: process.env.FILE_STORAGE_ROOT || path.join(process.cwd(), 'storage'),
      provider: (process.env.FILE_STORAGE_PROVIDER as 'local' | 'azure-blob') || 'local',
      maxSize: parseInt(process.env.FILE_MAX_SIZE || '52428800'), // 50MB default
      allowedExtensions: process.env.FILE_ALLOWED_EXTENSIONS?.split(',') || [
        'pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'heif', 'html', 'txt'
      ]
    }
  }

  /**
   * Initialize storage directory structure (lazy initialization)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    try {
      // Create root directory if it doesn't exist
      await fs.mkdir(this.config.rootPath, { recursive: true })

      // Create entity type subdirectories
      const entityTypes: DocumentType[] = ['GUIAENTRADA', 'HOJAREMISION', 'DOCUMENT']

      for (const type of entityTypes) {
        const typePath = path.join(this.config.rootPath, type)
        await fs.mkdir(typePath, { recursive: true })
      }

      this.initialized = true
      console.log(`[FileStorage] Initialized: ${this.config.rootPath}`)
    } catch (error) {
      console.error('[FileStorage] Failed to initialize file storage', error)
      throw error
    }
  }

  /**
   * Saves a file securely with proper validation
   * Now includes:
   * - Magic bytes validation (real content type detection)
   * - SHA-256 hash calculation (integrity verification)
   */
  async saveFile(options: SaveFileOptions): Promise<SavedFileResult> {
    try {
      // Ensure storage directories are initialized
      await this.ensureInitialized()

      const { entityType, entityId, file, date } = options

      // Validate file
      const sanitizedOriginalName = sanitizeFileName(file.name)

      if (!validateFileExtension(sanitizedOriginalName, this.config.allowedExtensions)) {
        const ext = sanitizedOriginalName.split('.').pop()
        return {
          success: false,
          error: `Invalid file extension: ${ext}. Allowed: ${this.config.allowedExtensions.join(', ')}`
        }
      }

      if (!validateFileSize(file.size, this.config.maxSize)) {
        return {
          success: false,
          error: `File size ${file.size} exceeds maximum ${this.config.maxSize} bytes`
        }
      }

      // Convert File to Buffer for validation
      let buffer: Buffer
      try {
        // Check if file has arrayBuffer method (standard File API)
        if (typeof file.arrayBuffer === 'function') {
          const arrayBuffer = await file.arrayBuffer()
          buffer = Buffer.from(arrayBuffer)
        } else {
          throw new Error('File object does not have arrayBuffer method')
        }
      } catch (error) {
        console.error('[FileStorage] Failed to read file content:', error)
        return {
          success: false,
          error: `Failed to read file content: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }

      // ============================================
      // NIVEL 2: Validación de Contenido Real (Magic Bytes)
      // ============================================

      let detectedMimeType: string
      let detectedExtension: string

      try {
        const validation = await validateFileContent(buffer)
        detectedMimeType = validation.mimeType
        detectedExtension = validation.extension
      } catch (error) {
        return {
          success: false,
          error: `Content validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }

      // ============================================
      // NIVEL 2: Cálculo de Hash SHA-256
      // ============================================

      const fileHash = calculateFileHash(buffer)
      console.log(`[FileStorage] SHA-256 hash: ${fileHash}`)

      // Generate paths using detected extension (not the one from filename)
      const relativePath = generateRelativePath(entityType, entityId, detectedExtension, date)
      const absolutePath = path.join(this.config.rootPath, relativePath)

      // Create directory structure
      const directory = path.dirname(absolutePath)
      await fs.mkdir(directory, { recursive: true })

      // Check if file already exists (avoid overwrite)
      try {
        await fs.access(absolutePath, constants.F_OK)
        console.warn(`[FileStorage] File already exists, will overwrite: ${absolutePath}`)
      } catch {
        // File doesn't exist, good to proceed
      }

      // Write file to disk
      await fs.writeFile(absolutePath, buffer)

      const storageFileName = generateStorageFileName(entityType, entityId, detectedExtension, date)

      console.log(`[FileStorage] File saved: ${storageFileName} -> ${relativePath}`)
      console.log(`[FileStorage] Security: Hash=${fileHash.substring(0, 16)}... MIME=${detectedMimeType}`)

      return {
        success: true,
        filePath: absolutePath,
        fileName: storageFileName,
        relativePath: relativePath.split(path.sep).join('/'), // Normalize to forward slashes for DB
        fileHash: fileHash,
        fileMimeType: detectedMimeType
      }

    } catch (error) {
      console.error('[FileStorage] Failed to save file', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Reads a file and returns as Buffer
   */
  async readFile(relativePath: string): Promise<Buffer | null> {
    try {
      // Convert forward slashes to backslashes for Windows
      const normalizedPath = relativePath.replace(/\//g, path.sep)
      const absolutePath = path.join(this.config.rootPath, normalizedPath)

      // Security: Ensure path is within root directory
      const resolvedRoot = path.resolve(this.config.rootPath)
      const resolvedAbsolute = path.resolve(absolutePath)

      if (!resolvedAbsolute.startsWith(resolvedRoot)) {
        throw new Error('Path traversal attempt detected')
      }

      return await fs.readFile(absolutePath)
    } catch (error) {
      console.error(`[FileStorage] Failed to read file: ${relativePath}`, error)
      return null
    }
  }

  /**
   * Deletes a file securely
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const normalizedPath = relativePath.replace(/\//g, path.sep)
      const absolutePath = path.join(this.config.rootPath, normalizedPath)

      // Security: Ensure path is within root directory
      const resolvedRoot = path.resolve(this.config.rootPath)
      const resolvedAbsolute = path.resolve(absolutePath)

      if (!resolvedAbsolute.startsWith(resolvedRoot)) {
        throw new Error('Path traversal attempt detected')
      }

      await fs.unlink(absolutePath)
      console.log(`[FileStorage] File deleted: ${relativePath}`)
      return true
    } catch (error) {
      console.error(`[FileStorage] Failed to delete file: ${relativePath}`, error)
      return false
    }
  }

  /**
   * Checks if a file exists
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const normalizedPath = relativePath.replace(/\//g, path.sep)
      const absolutePath = path.join(this.config.rootPath, normalizedPath)

      // Security: Ensure path is within root directory
      const resolvedRoot = path.resolve(this.config.rootPath)
      const resolvedAbsolute = path.resolve(absolutePath)

      if (!resolvedAbsolute.startsWith(resolvedRoot)) {
        return false
      }

      await fs.access(absolutePath, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Gets storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number
    totalSize: number
    breakdown: Record<string, { count: number; size: number }>
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      breakdown: {} as Record<string, { count: number; size: number }>
    }

    try {
      const entityTypes: DocumentType[] = ['GUIAENTRADA', 'HOJAREMISION', 'DOCUMENT']

      for (const type of entityTypes) {
        const typePath = path.join(this.config.rootPath, type)

        try {
          await fs.access(typePath)

          const files = await this.recursiveScan(typePath)
          stats.breakdown[type] = {
            count: files.length,
            size: files.reduce((sum, f) => sum + f.size, 0)
          }
          stats.totalFiles += files.length
          stats.totalSize += stats.breakdown[type].size
        } catch {
          // Directory doesn't exist
          stats.breakdown[type] = { count: 0, size: 0 }
        }
      }
    } catch (error) {
      console.error('[FileStorage] Failed to get storage stats', error)
    }

    return stats
  }

  /**
   * Recursively scans directory for files
   */
  private async recursiveScan(dirPath: string): Promise<Array<{ path: string; size: number }>> {
    const files: Array<{ path: string; size: number }> = []

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          const subFiles = await this.recursiveScan(fullPath)
          files.push(...subFiles)
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          files.push({
            path: fullPath,
            size: stats.size
          })
        }
      }
    } catch (error) {
      console.error(`[FileStorage] Failed to scan directory: ${dirPath}`, error)
    }

    return files
  }

  /**
   * Gets file information
   */
  async getFileInfo(relativePath: string): Promise<{
    exists: boolean
    size?: number
    created?: Date
    modified?: Date
  } | null> {
    try {
      const normalizedPath = relativePath.replace(/\//g, path.sep)
      const absolutePath = path.join(this.config.rootPath, normalizedPath)

      // Security: Ensure path is within root directory
      const resolvedRoot = path.resolve(this.config.rootPath)
      const resolvedAbsolute = path.resolve(absolutePath)

      if (!resolvedAbsolute.startsWith(resolvedRoot)) {
        throw new Error('Path traversal attempt detected')
      }

      const stats = await fs.stat(absolutePath)

      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      }
    } catch (error) {
      return { exists: false }
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const fileStorageService = new FileStorageService()
export default fileStorageService
