import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"

export const revalidate = 3600

async function resolveAuthorizedHojaFile(id: string) {
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

  if (!hoja.filePath) {
    return NextResponse.json(
      { error: "Esta hoja de remisión no tiene archivo asociado" },
      { status: 404 }
    )
  }

  const exists = await fileStorageService.fileExists(hoja.filePath)

  if (!exists) {
    return NextResponse.json(
      { error: "Archivo no encontrado en almacenamiento" },
      { status: 404 }
    )
  }

  return hoja
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hoja = await resolveAuthorizedHojaFile(id)

    if (hoja instanceof NextResponse) {
      return hoja
    }

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

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hoja = await resolveAuthorizedHojaFile(id)

    if (hoja instanceof NextResponse) {
      return hoja
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': hoja.fileMimeType || 'application/pdf',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error("Error verificando archivo de hoja de remisión:", error)
    return NextResponse.json(
      { error: "Error al verificar el archivo" },
      { status: 500 }
    )
  }
}
