import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

// GET - Obtener una guía por ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const guia = await prisma.guiaValija.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        items: {
          orderBy: { numeroItem: "asc" },
        },
        precintos: true,
      },
    })

    if (!guia) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    return NextResponse.json(guia)
  } catch (error) {
    console.error("Error fetching guia:", error)
    return NextResponse.json({ error: "Error fetching guia" }, { status: 500 })
  }
}

// PUT - Actualizar una guía
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    // Verificar que la guía pertenezca al usuario
    const existing = await prisma.guiaValija.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    // Si cambia el número de guía, verificar que no exista
    if (body.numeroGuia && body.numeroGuia !== existing.numeroGuia) {
      const duplicate = await prisma.guiaValija.findUnique({
        where: { numeroGuia: body.numeroGuia },
      })
      if (duplicate) {
        return NextResponse.json({ error: "El número de guía ya existe" }, { status: 400 })
      }
    }

    const guia = await prisma.guiaValija.update({
      where: { id },
      data: {
        numeroGuia: body.numeroGuia,
        tipoValija: body.tipoValija,
        fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : undefined,
        fechaEnvio: body.fechaEnvio ? new Date(body.fechaEnvio) : undefined,
        fechaRecibo: body.fechaRecibo ? new Date(body.fechaRecibo) : undefined,
        origenCiudad: body.origenCiudad,
        destinoCiudad: body.destinoCiudad,
        origenPais: body.origenPais,
        destinoPais: body.destinoPais,
        remitenteNombre: body.remitenteNombre,
        remitenteCargo: body.remitenteCargo,
        remitenteEmail: body.remitenteEmail,
        destinatarioNombre: body.destinatarioNombre,
        destinatarioCargo: body.destinatarioCargo,
        destinatarioEmail: body.destinatarioEmail,
        pesoValija: body.pesoValija ? parseFloat(body.pesoValija) : undefined,
        pesoOficial: body.pesoOficial ? parseFloat(body.pesoOficial) : undefined,
        numeroPaquetes: body.numeroPaquetes ? parseInt(body.numeroPaquetes) : undefined,
        descripcionContenido: body.descripcionContenido,
        observaciones: body.observaciones,
        preparadoPor: body.preparadoPor,
        revisadoPor: body.revisadoPor,
        firmaReceptor: body.firmaReceptor,
        estado: body.estado,
      },
      include: {
        items: true,
        precintos: true,
      },
    })

    return NextResponse.json(guia)
  } catch (error) {
    console.error("Error updating guia:", error)
    return NextResponse.json({ error: "Error updating guia" }, { status: 500 })
  }
}

// DELETE - Eliminar una guía
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    // Verificar que la guía pertenezca al usuario
    const existing = await prisma.guiaValija.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    await prisma.guiaValija.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting guia:", error)
    return NextResponse.json({ error: "Error deleting guia" }, { status: 500 })
  }
}
