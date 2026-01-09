import { prisma } from "@/lib/db"

// ============================================
// Types & Interfaces
// ============================================

export type AuditAction = 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'VIEW' | 'COPY'

export type DocumentType = 'GUIA_VALIJA' | 'HOJA_REMISION' | 'DOCUMENT' | 'FILE'

export interface AuditLogOptions {
  userId: string
  filePath: string
  action: AuditAction
  ipAddress?: string
  userAgent?: string
  fileSize?: number
  fileHash?: string
}

export interface DocumentViewAuditOptions {
  userId: string
  documentType: DocumentType
  documentId: string
  documentTitle: string
  ipAddress?: string
  userAgent?: string
}

// ============================================
// Audit Log Service
// ============================================

/**
 * Logs a file operation to the audit trail
 * This creates a record in FileAuditLog for security and compliance
 */
export async function logFileOperation(options: AuditLogOptions): Promise<void> {
  try {
    await prisma.fileAuditLog.create({
      data: {
        userId: options.userId,
        filePath: options.filePath,
        action: options.action,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        fileSize: options.fileSize,
        fileHash: options.fileHash,
        timestamp: new Date()
      }
    })

    console.log(`[FileAudit] ${options.action}: ${options.filePath} (User: ${options.userId})`)
  } catch (error) {
    console.error('[FileAudit] Failed to log operation:', error)
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Logs multiple file operations in a batch
 * Useful for bulk operations
 */
export async function logFileOperations(options: AuditLogOptions[]): Promise<void> {
  try {
    await prisma.fileAuditLog.createMany({
      data: options.map(opt => ({
        userId: opt.userId,
        filePath: opt.filePath,
        action: opt.action,
        ipAddress: opt.ipAddress,
        userAgent: opt.userAgent,
        fileSize: opt.fileSize,
        fileHash: opt.fileHash,
        timestamp: new Date()
      }))
    })

    console.log(`[FileAudit] Batch logged ${options.length} operations`)
  } catch (error) {
    console.error('[FileAudit] Failed to log batch operations:', error)
  }
}

/**
 * Retrieves audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    action?: AuditAction
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  }
) {
  const where: any = { userId }

  if (options?.action) {
    where.action = options.action
  }

  if (options?.startDate || options?.endDate) {
    where.timestamp = {}
    if (options.startDate) where.timestamp.gte = options.startDate
    if (options.endDate) where.timestamp.lte = options.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.fileAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.fileAuditLog.count({ where })
  ])

  return { logs, total }
}

/**
 * Retrieves audit logs for a specific file
 */
export async function getFileAuditLogs(filePath: string) {
  return await prisma.fileAuditLog.findMany({
    where: { filePath },
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })
}

/**
 * Gets audit statistics for a user
 */
export async function getUserAuditStats(userId: string) {
  const stats = await prisma.fileAuditLog.groupBy({
    by: ['action'],
    where: { userId },
    _count: {
      action: true
    }
  })

  return stats.map(stat => ({
    action: stat.action,
    count: stat._count.action
  }))
}

/**
 * Helper function to extract IP address from request
 */
export function extractIpAddress(request: Request): string | undefined {
  // Try various headers that might contain the real IP
  const headers = request.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined
  )
}

/**
 * Helper function to extract user agent from request
 */
export function extractUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined
}

// ============================================
// Document View Audit Functions
// ============================================

/**
 * Logs a document view event to the audit trail
 * This extends the base logFileOperation with document metadata
 */
export async function logDocumentView(options: DocumentViewAuditOptions): Promise<void> {
  try {
    await prisma.fileAuditLog.create({
      data: {
        userId: options.userId,
        filePath: `${options.documentType}/${options.documentId}`, // Encode type in path
        action: 'VIEW',
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        documentType: options.documentType,
        documentId: options.documentId,
        documentTitle: options.documentTitle,
        timestamp: new Date()
      }
    })

    console.log(`[FileAudit] VIEW ${options.documentType}: ${options.documentTitle} (User: ${options.userId})`)
  } catch (error) {
    console.error('[FileAudit] Failed to log document view:', error)
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Gets all audit logs for SUPER_ADMIN with filtering
 */
export async function getAuditLogsForAdmin(options: {
  documentType?: DocumentType
  documentId?: string
  userId?: string
  action?: AuditAction
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{ logs: any[], total: number }> {
  const where: any = {}

  if (options.documentType) where.documentType = options.documentType
  if (options.documentId) where.documentId = options.documentId
  if (options.userId) where.userId = options.userId
  if (options.action) where.action = options.action

  if (options.startDate || options.endDate) {
    where.timestamp = {}
    if (options.startDate) where.timestamp.gte = options.startDate
    if (options.endDate) where.timestamp.lte = options.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.fileAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    }),
    prisma.fileAuditLog.count({ where })
  ])

  return { logs, total }
}
