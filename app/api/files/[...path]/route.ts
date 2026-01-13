import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-v4"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { prisma } from "@/lib/db"
import { logFileOperation, extractIpAddress, extractUserAgent } from "@/lib/services/file-audit.service"

/**
 * GET /api/files/[...path]
 *
 * Serves files from local storage with security checks:
 * - Verifies user authentication
 * - Verifies file ownership (user must own the document/guia/hoja)
 * - Serves file with correct MIME type
 * - Supports both download and inline viewing
 *
 * Examples:
 * - GET /api/files/GUIAENTRADA/2025/02/20250225GUIAENTRADA_abc123.pdf
 * - GET /api/files/HOJAREMISION/2025/02/20250225HOJAREMISION_xyz789.pdf?inline=true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params (Next.js 15+)
    const { path: pathSegments } = await params

    // 1. Verify authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // 1.5. Check if user is ADMIN or SUPER_ADMIN (can view any file)
    const userRole = session.user.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN'
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

    // 2. Reconstruct the file path from URL segments
    const relativePath = pathSegments.join('/')

    if (!relativePath) {
      return NextResponse.json(
        { error: "Ruta de archivo no proporcionada" },
        { status: 400 }
      )
    }

    // 3. Verify file ownership by searching in all models
    const userId = session.user.id
    let isOwner = false
    let fileName = "archivo"
    let mimeType = "application/octet-stream"
    let fileSize: number | undefined
    let fileHash: string | undefined

    // Check Document model (allow admins to access any document)
    const document = await prisma.document.findFirst({
      where: {
        filePath: relativePath
      },
      select: { userId: true, fileName: true, fileType: true, fileSize: true, fileHash: true }
    })

    if (document) {
      // Allow access if owner OR admin
      if (document.userId === userId || isAdmin) {
        isOwner = true
        fileName = document.fileName
        mimeType = document.fileType
        fileSize = document.fileSize
        fileHash = document.fileHash ?? undefined
      }
    }

    // Check GuiaValija model (allow admins to access any guia)
    if (!isOwner) {
      const guia = await prisma.guiaValija.findFirst({
        where: {
          filePath: relativePath
        },
        select: { userId: true, numeroGuia: true, fileHash: true }
      })

      if (guia) {
        // Allow access if owner OR admin
        if (guia.userId === userId || isAdmin) {
          isOwner = true
          fileName = `GuiaValija_${guia.numeroGuia}.pdf`
          mimeType = "application/pdf"
          fileHash = guia.fileHash ?? undefined

          // Log admin access to other user's file
          if (isAdmin && guia.userId !== userId) {
            console.log(`[FileAPI] Admin ${userId} accessing GuiaValija file of user ${guia.userId}`)
          }
        }
      }
    }

    // Check HojaRemision model (allow admins to access any hoja)
    if (!isOwner) {
      const hoja = await prisma.hojaRemision.findFirst({
        where: {
          filePath: relativePath
        },
        select: { userId: true, numeroCompleto: true, fileHash: true }
      })

      if (hoja) {
        // Allow access if owner OR admin
        if (hoja.userId === userId || isAdmin) {
          isOwner = true
          fileName = `HojaRemision_${hoja.numeroCompleto}.pdf`
          mimeType = "application/pdf"
          fileHash = hoja.fileHash ?? undefined

          // Log admin access to other user's file
          if (isAdmin && hoja.userId !== userId) {
            console.log(`[FileAPI] Admin ${userId} accessing HojaRemision file of user ${hoja.userId}`)
          }
        }
      }
    }

    // 4. Deny access if file doesn't belong to user
    if (!isOwner) {
      return NextResponse.json(
        { error: "Archivo no encontrado o acceso denegado" },
        { status: 404 }
      )
    }

    // 5. Read file from storage
    const buffer = await fileStorageService.readFile(relativePath)

    if (!buffer) {
      return NextResponse.json(
        { error: "Archivo no encontrado en almacenamiento" },
        { status: 404 }
      )
    }

    // 6. Log file access to audit trail
    const url = new URL(request.url)
    const inline = url.searchParams.get('inline') === 'true'
    const action = inline ? 'VIEW' : 'DOWNLOAD'

    // Log audit asynchronously (don't wait for it)
    logFileOperation({
      userId: userId,
      filePath: relativePath,
      action: action,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                request.headers.get('x-real-ip') ||
                undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      fileSize: buffer.length,
      fileHash: fileHash
    }).catch(err => console.error('[Audit] Failed to log:', err))

    // 7. Determine Content-Disposition (inline or attachment)
    const contentDisposition = inline ? 'inline' : `attachment; filename="${fileName}"`

    // 8. Determine MIME type from extension if not set
    if (mimeType === "application/octet-stream") {
      const ext = relativePath.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        bmp: "image/bmp",
        tiff: "image/tiff",
        heif: "image/heif",
        html: "text/html",
        txt: "text/plain"
      }
      mimeType = ext ? mimeTypes[ext] || "application/octet-stream" : "application/octet-stream"
    }

    // 9. Return file with appropriate headers
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff' // Prevent MIME sniffing
      }
    })

  } catch (error) {
    console.error('[FileAPI] Error serving file:', error)

    return NextResponse.json(
      {
        error: "Error al servir el archivo",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
