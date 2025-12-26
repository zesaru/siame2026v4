import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"

// GET /api/guias-valija/[id] - Obtener guía específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const guia = await prisma.guiaValija.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!guia) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    return NextResponse.json(guia)
  } catch (error) {
    console.error("Error fetching guia:", error)
    return NextResponse.json(
      { error: "Failed to fetch guia de valija" },
      { status: 500 }
    )
  }
}

// PUT /api/guias-valija/[id] - Actualizar guía
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Verify ownership
    const existing = await prisma.guiaValija.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    // Update guia
    const guia = await prisma.guiaValija.update({
      where: { id: params.id },
      data: {
        ...(body.numeroGuia && { numeroGuia: body.numeroGuia }),
        ...(body.fechaEmision && { fechaEmision: new Date(body.fechaEmision) }),
        ...(body.origenDireccion !== undefined && { origenDireccion: body.origenDireccion }),
        ...(body.destinoDireccion !== undefined && { destinoDireccion: body.destinoDireccion }),
        ...(body.origenCiudad && { origenCiudad: body.origenCiudad }),
        ...(body.destinoCiudad && { destinoCiudad: body.destinoCiudad }),
        ...(body.origenPais && { origenPais: body.origenPais }),
        ...(body.destinoPais && { destinoPais: body.destinoPais }),
        ...(body.remitenteNombre !== undefined && { remitenteNombre: body.remitenteNombre }),
        ...(body.remitenteCargo !== undefined && { remitenteCargo: body.remitenteCargo }),
        ...(body.remitenteEmail !== undefined && { remitenteEmail: body.remitenteEmail }),
        ...(body.destinatarioNombre !== undefined && { destinatarioNombre: body.destinatarioNombre }),
        ...(body.destinatarioCargo !== undefined && { destinatarioCargo: body.destinatarioCargo }),
        ...(body.destinatarioEmail !== undefined && { destinatarioEmail: body.destinatarioEmail }),
        ...(body.pesoValija !== undefined && { pesoValija: body.pesoValija }),
        ...(body.numeroPaquetes !== undefined && { numeroPaquetes: body.numeroPaquetes }),
        ...(body.descripcionContenido !== undefined && { descripcionContenido: body.descripcionContenido }),
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        ...(body.estado && { estado: body.estado }),
      },
    })

    return NextResponse.json(guia)
  } catch (error: any) {
    console.error("Error updating guia:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una guía con ese número" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update guia de valija" },
      { status: 500 }
    )
  }
}

// DELETE /api/guias-valija/[id] - Eliminar guía
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify ownership
    const existing = await prisma.guiaValija.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    // Delete guia
    await prisma.guiaValija.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting guia:", error)
    return NextResponse.json(
      { error: "Failed to delete guia de valija" },
      { status: 500 }
    )
  }
}
