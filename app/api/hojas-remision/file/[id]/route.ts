import { NextRequest, NextResponse } from "next/server"
import { getHojaRemision } from "@/app/dashboard/hojas-remision/actions"
import { fileStorageService } from "@/lib/services/file-storage.service"

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ requires await for params
    const { id } = await params

    // Obtener hoja de remisión
    const result = await getHojaRemision(id)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: "Hoja de remisión no encontrada" },
        { status: 404 }
      )
    }

    const hoja = result.data

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
