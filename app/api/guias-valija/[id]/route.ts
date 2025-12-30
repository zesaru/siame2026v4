import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

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

    // Verificar que la guía pertenece al usuario
    const guia = await prisma.guiaValija.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!guia) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    // Eliminar la guía (los items y precintos se eliminan en cascade por el schema)
    await prisma.guiaValija.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Guía eliminada correctamente" })
  } catch (error) {
    console.error("Error deleting guia:", error)
    return NextResponse.json({ error: "Error deleting guia" }, { status: 500 })
  }
}
