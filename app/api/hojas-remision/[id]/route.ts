import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"

// GET /api/hojas-remision/[id] - Obtener hoja de remisión específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hoja = await prisma.hojaRemision.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        items: {
          orderBy: { numeroLinea: "asc" },
        },
      },
    })

    if (!hoja) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Verify ownership
    const existing = await prisma.hojaRemision.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    // Update hoja de remision
    const hoja = await prisma.hojaRemision.update({
      where: { id: params.id },
      data: {
        ...(body.numeroRemision && { numeroRemision: body.numeroRemision }),
        ...(body.tipoRemision && { tipoRemision: body.tipoRemision }),
        ...(body.fechaRemision && { fechaRemision: new Date(body.fechaRemision) }),
        ...(body.origenDireccion !== undefined && { origenDireccion: body.origenDireccion }),
        ...(body.destinoDireccion !== undefined && { destinoDireccion: body.destinoDireccion }),
        ...(body.origenCiudad && { origenCiudad: body.origenCiudad }),
        ...(body.destinoCiudad && { destinoCiudad: body.destinoCiudad }),
        ...(body.origenPais && { origenPais: body.origenPais }),
        ...(body.destinoPais && { destinoPais: body.destinoPais }),
        ...(body.remitenteNombre !== undefined && { remitenteNombre: body.remitenteNombre }),
        ...(body.remitenteEmpresa !== undefined && { remitenteEmpresa: body.remitenteEmpresa }),
        ...(body.remitenteRUC !== undefined && { remitenteRUC: body.remitenteRUC }),
        ...(body.remitenteEmail !== undefined && { remitenteEmail: body.remitenteEmail }),
        ...(body.remitenteTelefono !== undefined && { remitenteTelefono: body.remitenteTelefono }),
        ...(body.destinatarioNombre !== undefined && { destinatarioNombre: body.destinatarioNombre }),
        ...(body.destinatarioEmpresa !== undefined && { destinatarioEmpresa: body.destinatarioEmpresa }),
        ...(body.destinatarioRUC !== undefined && { destinatarioRUC: body.destinatarioRUC }),
        ...(body.destinatarioEmail !== undefined && { destinatarioEmail: body.destinatarioEmail }),
        ...(body.destinatarioTelefono !== undefined && { destinatarioTelefono: body.destinatarioTelefono }),
        ...(body.totalPeso !== undefined && { totalPeso: body.totalPeso }),
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        ...(body.ordenCompraRef !== undefined && { ordenCompraRef: body.ordenCompraRef }),
        ...(body.facturaRef !== undefined && { facturaRef: body.facturaRef }),
        ...(body.estado && { estado: body.estado }),
      },
    })

    // If items are provided, replace them
    if (body.items !== undefined) {
      // Delete existing items
      await prisma.remisionItem.deleteMany({
        where: { hojaRemisionId: params.id },
      })

      // Create new items
      const totalCantidad = body.items.reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0)

      await prisma.remisionItem.createMany({
        data: body.items.map((item: any, index: number) => ({
          hojaRemisionId: params.id,
          numeroLinea: index + 1,
          codigo: item.codigo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida,
          precioUnitario: item.precioUnitario,
          total: item.total,
          peso: item.peso,
          observaciones: item.observaciones,
        })),
      })

      // Update totalCantidad
      await prisma.hojaRemision.update({
        where: { id: params.id },
        data: { totalCantidad },
      })
    }

    // Fetch updated hoja with items
    const updatedHoja = await prisma.hojaRemision.findUnique({
      where: { id: params.id },
      include: {
        items: {
          orderBy: { numeroLinea: "asc" },
        },
      },
    })

    return NextResponse.json(updatedHoja)
  } catch (error: any) {
    console.error("Error updating hoja de remision:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una hoja de remisión con ese número" },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify ownership
    const existing = await prisma.hojaRemision.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Hoja de remisión no encontrada" }, { status: 404 })
    }

    // Delete hoja de remision (items will be cascade deleted)
    await prisma.hojaRemision.delete({
      where: { id: params.id },
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
