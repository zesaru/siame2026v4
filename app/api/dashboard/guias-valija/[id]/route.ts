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
import { canDeleteRecords, canViewAllRecords } from "@/lib/middleware/authorization"

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
      where: { id },
      include: {
        items: { orderBy: { numeroItem: "asc" } },
        precintos: true,
      },
    })

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

    // Admin/SUPER_ADMIN can update any guia, regular users only their own
    const isAdmin = canViewAllRecords(session.user.role)

    // First verify the guia exists
    const existing = await prisma.guiaValija.findFirst({
      where: isAdmin ? { id } : { id, userId: session.user.id },
      select: { id: true, numeroGuia: true, userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    // Check for duplicate numeroGuia
    if (parsedBody.value.numeroGuia && parsedBody.value.numeroGuia !== existing.numeroGuia) {
      const duplicate = await prisma.guiaValija.findFirst({
        where: { numeroGuia: parsedBody.value.numeroGuia },
        select: { id: true },
      })
      if (duplicate) {
        return NextResponse.json({ error: "El número de guía ya existe" }, { status: 400 })
      }
    }

    // For admin updating another user's guia, use the guia owner's userId
    const targetUserId = isAdmin && existing.userId !== session.user.id
      ? existing.userId
      : session.user.id

    const repository = new PrismaGuiaValijaRepository(prisma)
    const useCase = new UpdateGuiaValijaByIdForUserUseCase(repository)
    const result = await useCase.execute({
      id,
      userId: targetUserId,
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

  if (!canDeleteRecords(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const isAdmin = canViewAllRecords(session.user.role)
    const existing = await prisma.guiaValija.findFirst({
      where: isAdmin ? { id } : { id, userId: session.user.id },
      select: { id: true, userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    const repository = new PrismaGuiaValijaRepository(prisma)
    const useCase = new DeleteGuiaValijaByIdForUserUseCase(repository)
    const result = await useCase.execute({
      id,
      userId: isAdmin ? existing.userId : session.user.id,
    })

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
