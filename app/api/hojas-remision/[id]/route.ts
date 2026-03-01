import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"
import { logDocumentView, extractIpAddress, extractUserAgent } from "@/lib/services/file-audit.service"
import { shouldTrackView } from "@/lib/utils"
import { GetHojaRemisionByIdForUserUseCase } from "@/modules/hojas-remision/application/queries"
import {
  DeleteHojaRemisionUseCase,
  UpdateHojaRemisionUseCase,
} from "@/modules/hojas-remision/application/use-cases"
import { toHojaRemisionDto } from "@/modules/hojas-remision/application/mappers"
import { parseUpdateHojaRemisionCommand } from "@/modules/hojas-remision/application/validation"
import { PrismaHojaRemisionRepository } from "@/modules/hojas-remision/infrastructure"

// GET /api/hojas-remision/[id] - Obtener hoja de remisión específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Optional query: trackView=0 disables VIEW audit registration for technical reads.
  try {
    const { id } = await params
    const trackView = shouldTrackView(req.url)
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)

    const repository = new PrismaHojaRemisionRepository(prisma)
    const useCase = new GetHojaRemisionByIdForUserUseCase(repository)
    const result = await useCase.execute(id, session.user.id)

    if (!result.ok) {
      console.error("Error fetching hoja de remision:", result.error)
      return NextResponse.json(
        { error: "Failed to fetch hoja de remision" },
        { status: 500 }
      )
    }

    const hoja = result.value

    if (!hoja) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    if (trackView) {
      // Log document view (non-blocking)
      logDocumentView({
        userId: session.user.id,
        documentType: 'HOJA_REMISION',
        documentId: hoja.id,
        documentTitle: hoja.numeroCompleto,
        ipAddress,
        userAgent
      }).catch(err => console.error('[Audit] Failed to log view:', err))
    }

    return NextResponse.json(toHojaRemisionDto(hoja))
  } catch (error) {
    console.error("Error fetching hoja de remision:", error)
    return NextResponse.json(
      { error: "Failed to fetch hoja de remision" },
      { status: 500 }
    )
  }
}

// PUT /api/hojas-remision/[id] - Actualizar hoja de remisión
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsedBody = parseUpdateHojaRemisionCommand(body)
    if (!parsedBody.ok) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const repository = new PrismaHojaRemisionRepository(prisma)
    const useCase = new UpdateHojaRemisionUseCase(repository)
    const result = await useCase.execute({
      id,
      userId: session.user.id,
      ...parsedBody.value,
    })

    if (!result.ok) {
      console.error("Error updating hoja de remision:", result.error)
      return NextResponse.json(
        { error: "Failed to update hoja de remision" },
        { status: 500 }
      )
    }

    if (result.value.status === "not_found") {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    if (result.value.status === "duplicate_numero_completo") {
      return NextResponse.json(
        { error: "Ya existe una hoja de remisión con ese número completo" },
        { status: 409 }
      )
    }

    return NextResponse.json(toHojaRemisionDto(result.value.hoja))
  } catch (error: any) {
    console.error("Error updating hoja de remision:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una hoja de remisión con ese número completo" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update hoja de remision" },
      { status: 500 }
    )
  }
}

// DELETE /api/hojas-remision/[id] - Eliminar hoja de remisión
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const repository = new PrismaHojaRemisionRepository(prisma)
    const useCase = new DeleteHojaRemisionUseCase(repository)
    const result = await useCase.execute(id, session.user.id)

    if (!result.ok) {
      console.error("Error deleting hoja de remision:", result.error)
      return NextResponse.json(
        { error: "Failed to delete hoja de remision" },
        { status: 500 }
      )
    }

    if (result.value.status === "not_found") {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting hoja de remision:", error)
    return NextResponse.json(
      { error: "Failed to delete hoja de remision" },
      { status: 500 }
    )
  }
}
