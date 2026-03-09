import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest, context: { params: Promise<{ batchId: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 })
  }

  const { batchId } = await context.params

  const batch = await prisma.guiaValijaUploadBatch.findFirst({
    where: {
      id: batchId,
      userId: session.user.id,
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  if (!batch) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
  }

  return NextResponse.json(batch)
}
