import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { GetGuiaValijaByIdForUserUseCase } from "@/modules/guias-valija/application/queries"
import {
  DeleteGuiaValijaByIdForUserUseCase,
  UpdateGuiaValijaByIdForUserUseCase,
} from "@/modules/guias-valija/application/use-cases"
import { toGuiaValijaDetailDto } from "@/modules/guias-valija/application/mappers"
import { parseUpdateGuiaValijaCommand } from "@/modules/guias-valija/application/validation"
import { PrismaGuiaValijaRepository } from "@/modules/guias-valija/infrastructure"

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
    const repository = new PrismaGuiaValijaRepository(prisma)
    const useCase = new GetGuiaValijaByIdForUserUseCase(repository)
    const result = await useCase.execute({ id, userId: session.user.id })

    if (!result.ok) {
      console.error("Error fetching guia:", result.error)
      return NextResponse.json({ error: "Error fetching guia" }, { status: 500 })
    }

    const guia = result.value

    if (!guia) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    return NextResponse.json(toGuiaValijaDetailDto(guia))
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
    const parsedBody = parseUpdateGuiaValijaCommand(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "Datos inválidos para actualizar guía", details: parsedBody.error.details },
        { status: 400 },
      )
    }

    const repository = new PrismaGuiaValijaRepository(prisma)
    const useCase = new UpdateGuiaValijaByIdForUserUseCase(repository)
    const result = await useCase.execute({
      id,
      userId: session.user.id,
      data: parsedBody.value,
    })

    if (!result.ok) {
      console.error("Error updating guia:", result.error)
      return NextResponse.json({ error: "Error updating guia" }, { status: 500 })
    }

    if (result.value.status === "not_found") {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    if (result.value.status === "duplicate_numero_guia") {
      return NextResponse.json({ error: "El número de guía ya existe" }, { status: 400 })
    }

    return NextResponse.json(toGuiaValijaDetailDto(result.value.guia))
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
    const repository = new PrismaGuiaValijaRepository(prisma)
    const useCase = new DeleteGuiaValijaByIdForUserUseCase(repository)
    const result = await useCase.execute({ id, userId: session.user.id })

    if (!result.ok) {
      console.error("Error deleting guia:", result.error)
      return NextResponse.json({ error: "Error deleting guia" }, { status: 500 })
    }

    if (!result.value.deleted) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting guia:", error)
    return NextResponse.json({ error: "Error deleting guia" }, { status: 500 })
  }
}
