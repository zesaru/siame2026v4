import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"

export const revalidate = 3600

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ requires await for params
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const hoja = await prisma.hojaRemision.findFirst({ where: { id } })

    if (!hoja) {
      return NextResponse.json(
        { error: "Hoja de remisión no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que tenga archivo
    if (!hoja.filePath) {
      return NextResponse.json(
        { error: "Esta hoja de remisión no tiene archivo asociado" },
        { status: 404 }
      )
    }

    // Obtener archivo del storage (usar readFile, no getFile)
    const fileBuffer = await fileStorageService.readFile(hoja.filePath)

    if (!fileBuffer) {
      return NextResponse.json(
        { error: "Archivo no encontrado en storage" },
        { status: 404 }
      )
    }

    // Retornar archivo con headers apropiados
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': hoja.fileMimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="hoja-remision-${hoja.numeroCompleto}.pdf"`,
        'Cache-Control': 'public, max-age=31536000', // 1 año
      },
    })
  } catch (error) {
    console.error("Error sirviendo archivo de hoja de remisión:", error)
    return NextResponse.json(
      { error: "Error al obtener el archivo" },
      { status: 500 }
    )
  }
}
