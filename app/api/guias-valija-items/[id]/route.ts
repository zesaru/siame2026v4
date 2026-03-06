import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const item = await prisma.guiaValijaItem.findUnique({
      where: { id },
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
    })

    if (!item) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error fetching guia valija item:", error)
    return NextResponse.json({ error: "Error al obtener item" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()

    const numeroItem = Number(body.numeroItem)
    const destinatario = typeof body.destinatario === "string" ? body.destinatario.trim() : ""
    const contenido = typeof body.contenido === "string" ? body.contenido.trim() : ""
    const remitente = typeof body.remitente === "string" ? body.remitente.trim() : ""
    const cantidad = body.cantidad === "" || body.cantidad === null || body.cantidad === undefined
      ? null
      : Number(body.cantidad)
    const peso = body.peso === "" || body.peso === null || body.peso === undefined
      ? null
      : Number(body.peso)

    if (!Number.isFinite(numeroItem) || numeroItem < 1) {
      return NextResponse.json({ error: "Número de item inválido" }, { status: 400 })
    }

    if (!destinatario || !contenido) {
      return NextResponse.json({ error: "Destinatario y contenido son obligatorios" }, { status: 400 })
    }

    if (cantidad !== null && (!Number.isFinite(cantidad) || cantidad < 0)) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 })
    }

    if (peso !== null && (!Number.isFinite(peso) || peso < 0)) {
      return NextResponse.json({ error: "Peso inválido" }, { status: 400 })
    }

    const existing = await prisma.guiaValijaItem.findUnique({
      where: { id },
      select: { id: true, guiaValijaId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 })
    }

    const updated = await prisma.guiaValijaItem.update({
      where: { id },
      data: {
        numeroItem,
        destinatario,
        contenido,
        remitente: remitente || null,
        cantidad,
        peso,
      },
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
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error("Error updating guia valija item:", error)

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un item con ese número en la guía" },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: "Error al actualizar item" }, { status: 500 })
  }
}
