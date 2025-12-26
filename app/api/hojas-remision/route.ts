import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"

// GET /api/hojas-remision - Listar hojas de remisión del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const estado = searchParams.get("estado") || ""
    const tipo = searchParams.get("tipo") || ""

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (search) {
      where.OR = [
        { numeroRemision: { contains: search, mode: "insensitive" } },
        { remitenteNombre: { contains: search, mode: "insensitive" } },
        { destinatarioNombre: { contains: search, mode: "insensitive" } },
        { origenCiudad: { contains: search, mode: "insensitive" } },
        { destinoCiudad: { contains: search, mode: "insensitive" } },
      ]
    }

    if (estado) {
      where.estado = estado
    }

    if (tipo) {
      where.tipoRemision = tipo
    }

    // Get total count
    const total = await prisma.hojaRemision.count({ where })

    // Get hojas de remision
    const hojas = await prisma.hojaRemision.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { numeroLinea: "asc" },
        },
      },
    })

    return NextResponse.json({
      hojas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching hojas de remision:", error)
    return NextResponse.json(
      { error: "Failed to fetch hojas de remision" },
      { status: 500 }
    )
  }
}

// POST /api/hojas-remision - Crear nueva hoja de remisión
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.numeroRemision) {
      return NextResponse.json(
        { error: "numeroRemision is required" },
        { status: 400 }
      )
    }

    if (!body.tipoRemision || !["entrada", "salida", "traslado"].includes(body.tipoRemision)) {
      return NextResponse.json(
        { error: "tipoRemision must be 'entrada', 'salida', or 'traslado'" },
        { status: 400 }
      )
    }

    if (!body.origenCiudad || !body.destinoCiudad) {
      return NextResponse.json(
        { error: "origenCiudad and destinoCiudad are required" },
        { status: 400 }
      )
    }

    if (!body.origenPais || !body.destinoPais) {
      return NextResponse.json(
        { error: "origenPais and destinoPais are required" },
        { status: 400 }
      )
    }

    if (!body.remitenteNombre || !body.destinatarioNombre) {
      return NextResponse.json(
        { error: "remitenteNombre and destinatarioNombre are required" },
        { status: 400 }
      )
    }

    // Calculate totals from items
    const items = body.items || []
    const totalCantidad = items.reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0)

    // Create hoja de remision with items
    const hoja = await prisma.hojaRemision.create({
      data: {
        userId: session.user.id,
        numeroRemision: body.numeroRemision,
        tipoRemision: body.tipoRemision,
        fechaRemision: body.fechaRemision ? new Date(body.fechaRemision) : new Date(),
        origenDireccion: body.origenDireccion || {},
        destinoDireccion: body.destinoDireccion || {},
        origenCiudad: body.origenCiudad,
        destinoCiudad: body.destinoCiudad,
        origenPais: body.origenPais,
        destinoPais: body.destinoPais,
        remitenteNombre: body.remitenteNombre,
        remitenteEmpresa: body.remitenteEmpresa,
        remitenteRUC: body.remitenteRUC,
        remitenteEmail: body.remitenteEmail,
        remitenteTelefono: body.remitenteTelefono,
        destinatarioNombre: body.destinatarioNombre,
        destinatarioEmpresa: body.destinatarioEmpresa,
        destinatarioRUC: body.destinatarioRUC,
        destinatarioEmail: body.destinatarioEmail,
        destinatarioTelefono: body.destinatarioTelefono,
        totalCantidad,
        totalPeso: body.totalPeso,
        observaciones: body.observaciones,
        ordenCompraRef: body.ordenCompraRef,
        facturaRef: body.facturaRef,
        estado: body.estado || "borrador",
        items: {
          create: items.map((item: any, index: number) => ({
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
        },
      },
    })

    return NextResponse.json(hoja, { status: 201 })
  } catch (error: any) {
    console.error("Error creating hoja de remision:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una hoja de remisión con ese número" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create hoja de remision" },
      { status: 500 }
    )
  }
}
