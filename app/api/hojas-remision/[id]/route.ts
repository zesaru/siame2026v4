import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"
import { logDocumentView, extractIpAddress, extractUserAgent } from "@/lib/services/file-audit.service"

// GET /api/hojas-remision/[id] - Obtener hoja de remisión específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)

    const hoja = await prisma.hojaRemision.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!hoja) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    // Log document view (non-blocking)
    logDocumentView({
      userId: session.user.id,
      documentType: 'HOJA_REMISION',
      documentId: hoja.id,
      documentTitle: hoja.numeroCompleto,
      ipAddress,
      userAgent
    }).catch(err => console.error('[Audit] Failed to log view:', err))

    return NextResponse.json(hoja)
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

    // Verify ownership
    const existing = await prisma.hojaRemision.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    // Update hoja de remision (sin items)
    const hoja = await prisma.hojaRemision.update({
      where: { id },
      data: {
        ...(body.numero !== undefined && { numero: body.numero }),
        ...(body.numeroCompleto && { numeroCompleto: body.numeroCompleto }),
        ...(body.siglaUnidad && { siglaUnidad: body.siglaUnidad }),
        ...(body.fecha && { fecha: new Date(body.fecha) }),
        ...(body.para !== undefined && { para: body.para }),
        ...(body.remitente !== undefined && { remitente: body.remitente }),
        ...(body.referencia !== undefined && { referencia: body.referencia }),
        ...(body.documento !== undefined && { documento: body.documento }),
        ...(body.asunto !== undefined && { asunto: body.asunto }),
        ...(body.destino !== undefined && { destino: body.destino }),
        ...(body.peso !== undefined && { peso: body.peso }),
        ...(body.estado && { estado: body.estado }),
      },
    })

    return NextResponse.json(hoja)
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

    // Verify ownership
    const existing = await prisma.hojaRemision.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    // Eliminar referencias en GuiaValijaItem
    await prisma.guiaValijaItem.updateMany({
      where: { hojaRemisionId: id },
      data: { hojaRemisionId: null },
    })

    // Eliminar la hoja de remisión
    await prisma.hojaRemision.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting hoja de remision:", error)
    return NextResponse.json(
      { error: "Failed to delete hoja de remision" },
      { status: 500 }
    )
  }
}
