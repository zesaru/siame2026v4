import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const fechaDesde = searchParams.get("fechaDesde")
    const fechaHasta = searchParams.get("fechaHasta")
    const guiaId = searchParams.get("guiaId")
    const estado = searchParams.get("estado")
    const pesoMin = searchParams.get("pesoMin")
    const pesoMax = searchParams.get("pesoMax")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Construir filtros de Prisma
    const where: any = {}

    // Búsqueda global
    if (search) {
      where.OR = [
        { destinatario: { contains: search, mode: "insensitive" } },
        { contenido: { contains: search, mode: "insensitive" } },
        { remitente: { contains: search, mode: "insensitive" } },
      ]
    }

    // Filtro por guía específica
    if (guiaId) {
      where.guiaValijaId = guiaId
    }

    // Filtros avanzados usando la relación con Guía
    if (estado || fechaDesde || fechaHasta) {
      where.guiaValija = {}
      if (estado) {
        where.guiaValija.estado = estado
      }
      if (fechaDesde || fechaHasta) {
        where.guiaValija.fechaEnvio = {}
        if (fechaDesde) {
          where.guiaValija.fechaEnvio.gte = new Date(fechaDesde)
        }
        if (fechaHasta) {
          where.guiaValija.fechaEnvio.lte = new Date(fechaHasta)
        }
      }
    }

    // Filtro por rango de peso
    if (pesoMin || pesoMax) {
      where.peso = {}
      if (pesoMin) {
        where.peso.gte = parseFloat(pesoMin)
      }
      if (pesoMax) {
        where.peso.lte = parseFloat(pesoMax)
      }
    }

    // Obtener items con filtros
    const [items, total] = await Promise.all([
      prisma.guiaValijaItem.findMany({
        where,
        include: {
          guiaValija: {
            select: {
              id: true,
              numeroGuia: true,
              fechaEnvio: true,
              estado: true,
            },
          },
        },
        orderBy: { numeroItem: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.guiaValijaItem.count({ where }),
    ])

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching items:", error)
    return NextResponse.json(
      { error: "Error al obtener items" },
      { status: 500 }
    )
  }
}
