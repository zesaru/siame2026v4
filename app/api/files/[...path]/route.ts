import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-v4"
import { ServeAuthorizedFileUseCase } from "@/modules/files/application/use-cases"

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

    // 2. Reconstruct the file path from URL segments
    const relativePath = pathSegments.join('/')

    if (!relativePath) {
      return NextResponse.json(
        { error: "Ruta de archivo no proporcionada" },
        { status: 400 }
      )
    }

    const url = new URL(request.url)
    const inline = url.searchParams.get('inline') === 'true'
    const useCase = new ServeAuthorizedFileUseCase()
    const result = await useCase.execute({
      relativePath,
      userId: session.user.id,
      userRole,
      inline,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    if (!result.ok) {
      throw result.error
    }

    if (result.value.status === 'invalid_path') {
      return NextResponse.json({ error: result.value.message }, { status: 400 })
    }
    if (result.value.status === 'not_found_or_denied') {
      return NextResponse.json({ error: result.value.message }, { status: 404 })
    }
    if (result.value.status === 'storage_not_found') {
      return NextResponse.json({ error: result.value.message }, { status: 404 })
    }

    const { buffer, mimeType, fileName } = result.value
    const contentDisposition = inline ? 'inline' : `attachment; filename="${fileName}"`

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
