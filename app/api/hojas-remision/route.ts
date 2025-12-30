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

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (search) {
      where.OR = [
        { numeroCompleto: { contains: search, mode: "insensitive" } },
        { para: { contains: search, mode: "insensitive" } },
        { remitente: { contains: search, mode: "insensitive" } },
        { destino: { contains: search, mode: "insensitive" } },
        { asunto: { contains: search, mode: "insensitive" } },
      ]
    }

    if (estado) {
      where.estado = estado
    }

    // Get total count
    const total = await prisma.hojaRemision.count({ where })

    // Get hojas de remision (sin items)
    const hojas = await prisma.hojaRemision.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
    if (!body.numeroCompleto) {
      return NextResponse.json(
        { error: "numeroCompleto is required" },
        { status: 400 }
      )
    }

    if (!body.siglaUnidad || body.siglaUnidad.length > 10) {
      return NextResponse.json(
        { error: "siglaUnidad is required (max 10 chars)" },
        { status: 400 }
      )
    }

    if (!body.para || !body.remitente) {
      return NextResponse.json(
        { error: "para and remitente are required" },
        { status: 400 }
      )
    }

    if (!body.documento || !body.asunto || !body.destino) {
      return NextResponse.json(
        { error: "documento, asunto, and destino are required" },
        { status: 400 }
      )
    }

    // Create hoja de remision (sin items)
    const hoja = await prisma.hojaRemision.create({
      data: {
        userId: session.user.id,
        numero: body.numero || 0,
        numeroCompleto: body.numeroCompleto,
        siglaUnidad: body.siglaUnidad,
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
        para: body.para,
        remitente: body.remitente,
        referencia: body.referencia,
        documento: body.documento,
        asunto: body.asunto,
        destino: body.destino,
        peso: body.peso,
        estado: body.estado || "borrador",
      },
    })

    return NextResponse.json(hoja, { status: 201 })
  } catch (error: any) {
    console.error("Error creating hoja de remision:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una hoja de remisión con ese número completo" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create hoja de remision" },
      { status: 500 }
    )
  }
}
