import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"

// GET /api/guias-valija - Listar guías de valija del usuario
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

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (search) {
      where.OR = [
        { numeroGuia: { contains: search, mode: "insensitive" } },
        { remitenteNombre: { contains: search, mode: "insensitive" } },
        { destinatarioNombre: { contains: search, mode: "insensitive" } },
        { origenCiudad: { contains: search, mode: "insensitive" } },
        { destinoCiudad: { contains: search, mode: "insensitive" } },
      ]
    }

    if (estado) {
      where.estado = estado
    }

    // Get total count
    const total = await prisma.guiaValija.count({ where })

    // Get guias
    const guias = await prisma.guiaValija.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      guias,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching guias:", error)
    return NextResponse.json(
      { error: "Failed to fetch guias de valija" },
      { status: 500 }
    )
  }
}

// POST /api/guias-valija - Crear nueva guía de valija
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.numeroGuia) {
      return NextResponse.json(
        { error: "numeroGuia is required" },
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

    // Create guia
    const guia = await prisma.guiaValija.create({
      data: {
        userId: session.user.id,
        numeroGuia: body.numeroGuia,
        fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : new Date(),
        origenDireccion: body.origenDireccion || {},
        destinoDireccion: body.destinoDireccion || {},
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
        pesoValija: body.pesoValija,
        numeroPaquetes: body.numeroPaquetes,
        descripcionContenido: body.descripcionContenido,
        observaciones: body.observaciones,
        estado: body.estado || "pendiente",
      },
    })

    return NextResponse.json(guia, { status: 201 })
  } catch (error: any) {
    console.error("Error creating guia:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una guía con ese número" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create guia de valija" },
      { status: 500 }
    )
  }
}
