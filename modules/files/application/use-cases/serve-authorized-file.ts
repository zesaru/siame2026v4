import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { logFileOperation } from "@/lib/services/file-audit.service"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"

export interface ServeAuthorizedFileInput {
  relativePath: string
  userId: string
  userRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  inline: boolean
  ipAddress?: string
  userAgent?: string
}

export type ServeAuthorizedFileOutcome =
  | { status: 'ok'; buffer: Buffer; mimeType: string; fileName: string; inline: boolean }
  | { status: 'invalid_path'; message: string }
  | { status: 'not_found_or_denied'; message: string }
  | { status: 'storage_not_found'; message: string }

export class ServeAuthorizedFileUseCase {
  async execute(input: ServeAuthorizedFileInput): Promise<Result<ServeAuthorizedFileOutcome, ApplicationError>> {
    try {
      const { relativePath, userId, userRole, inline, ipAddress, userAgent } = input
      if (!relativePath) {
        return ok({ status: 'invalid_path', message: 'Ruta de archivo no proporcionada' })
      }

      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
      let isOwner = false
      let fileName = 'archivo'
      let mimeType = 'application/octet-stream'
      let fileHash: string | undefined

      const document = await prisma.document.findFirst({
        where: { filePath: relativePath },
        select: { userId: true, fileName: true, fileType: true, fileHash: true },
      })
      if (document && (document.userId === userId || isAdmin)) {
        isOwner = true
        fileName = document.fileName
        mimeType = document.fileType
        fileHash = document.fileHash ?? undefined
      }

      if (!isOwner) {
        const guia = await prisma.guiaValija.findFirst({
          where: { filePath: relativePath },
          select: { userId: true, numeroGuia: true, fileHash: true },
        })
        if (guia && (guia.userId === userId || isAdmin)) {
          isOwner = true
          fileName = `GuiaValija_${guia.numeroGuia}.pdf`
          mimeType = 'application/pdf'
          fileHash = guia.fileHash ?? undefined
        }
      }

      if (!isOwner) {
        const hoja = await prisma.hojaRemision.findFirst({
          where: { filePath: relativePath },
          select: { userId: true, numeroCompleto: true, fileHash: true },
        })
        if (hoja && (hoja.userId === userId || isAdmin)) {
          isOwner = true
          fileName = `HojaRemision_${hoja.numeroCompleto}.pdf`
          mimeType = 'application/pdf'
          fileHash = hoja.fileHash ?? undefined
        }
      }

      if (!isOwner) {
        return ok({ status: 'not_found_or_denied', message: 'Archivo no encontrado o acceso denegado' })
      }

      const buffer = await fileStorageService.readFile(relativePath)
      if (!buffer) {
        return ok({ status: 'storage_not_found', message: 'Archivo no encontrado en almacenamiento' })
      }

      logFileOperation({
        userId,
        filePath: relativePath,
        action: inline ? 'VIEW' : 'DOWNLOAD',
        ipAddress,
        userAgent,
        fileSize: buffer.length,
        fileHash,
      }).catch((err) => console.error('[Audit] Failed to log:', err))

      if (mimeType === 'application/octet-stream') {
        const ext = relativePath.split('.').pop()?.toLowerCase()
        const mimeTypes: Record<string, string> = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          bmp: 'image/bmp',
          tiff: 'image/tiff',
          heif: 'image/heif',
          html: 'text/html',
          txt: 'text/plain',
        }
        mimeType = ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream'
      }

      return ok({ status: 'ok', buffer, mimeType, fileName, inline })
    } catch (cause) {
      return err(new ApplicationError('FILE_SERVE_FAILED', 'Error al servir el archivo', cause))
    }
  }
}
