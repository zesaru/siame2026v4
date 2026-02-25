import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { prisma } from "@/lib/db"
import { ListHojasRemisionUseCase } from "@/modules/hojas-remision/application/queries"
import { CreateHojaRemisionUseCase } from "@/modules/hojas-remision/application/use-cases"
import { toHojasRemisionListResponseDto, toHojaRemisionDto } from "@/modules/hojas-remision/application/mappers"
import {
  parseCreateHojaRemisionCommand,
  parseHojasRemisionListQuery,
} from "@/modules/hojas-remision/application/validation"
import { PrismaHojaRemisionRepository } from "@/modules/hojas-remision/infrastructure"

// Revalidate hojas de remision list every 60 seconds
export const revalidate = 60

// GET /api/hojas-remision - Listar hojas de remisión del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const parsedQuery = parseHojasRemisionListQuery({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      search: searchParams.get("search") || "",
      estado: searchParams.get("estado") || "",
    })

    if (!parsedQuery.ok) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 })
    }

    const { page, limit, search, estado } = parsedQuery.value
    const repository = new PrismaHojaRemisionRepository(prisma)
    const useCase = new ListHojasRemisionUseCase(repository)
    const result = await useCase.execute({ userId: session.user.id, page, limit, search, estado })

    if (!result.ok) {
      console.error("Error fetching hojas de remision:", result.error)
      return NextResponse.json(
        { error: "Failed to fetch hojas de remision" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      toHojasRemisionListResponseDto({
        hojas: result.value.hojas,
        page,
        limit,
        total: result.value.total,
      })
    )
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
    const parsedBody = parseCreateHojaRemisionCommand(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error.message },
        { status: 400 }
      )
    }

    const repository = new PrismaHojaRemisionRepository(prisma)
    const useCase = new CreateHojaRemisionUseCase(repository)
    const result = await useCase.execute({
      userId: session.user.id,
      ...parsedBody.value,
    })

    if (!result.ok) {
      console.error("Error creating hoja de remision:", result.error)
      return NextResponse.json(
        { error: "Failed to create hoja de remision" },
        { status: 500 }
      )
    }

    if (result.value.status === "duplicate_numero_completo") {
      return NextResponse.json(
        { error: "Ya existe una hoja de remisión con ese número completo" },
        { status: 409 }
      )
    }

    return NextResponse.json(toHojaRemisionDto(result.value.hoja), { status: 201 })
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
