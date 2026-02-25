import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { GetHojaRemisionByIdForUserUseCase } from "@/modules/hojas-remision/application/queries"
import { PrismaHojaRemisionRepository } from "@/modules/hojas-remision/infrastructure"

export const revalidate = 3600

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ requires await for params
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const repository = new PrismaHojaRemisionRepository(prisma)
    const useCase = new GetHojaRemisionByIdForUserUseCase(repository)
    const result = await useCase.execute(id, session.user.id)

    if (!result.ok) {
      return NextResponse.json(
        { error: "Error al obtener la hoja de remisión" },
        { status: 500 }
      )
    }

    if (!result.value) {
      return NextResponse.json(
        { error: "Hoja de remisión no encontrada" },
        { status: 404 }
      )
    }

    const hoja = result.value

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
