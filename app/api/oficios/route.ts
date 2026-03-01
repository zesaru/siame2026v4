import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"

export const revalidate = 60

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20") || 20))
    const search = (searchParams.get("search") || "").trim()

    const where = {
      userId: session.user.id,
      ...(search
        ? {
            OR: [
              { numeroOficio: { contains: search, mode: "insensitive" as const } },
              { asunto: { contains: search, mode: "insensitive" as const } },
              { remitente: { contains: search, mode: "insensitive" as const } },
              { destinatario: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const [oficios, total] = await Promise.all([
      prisma.oficio.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          numeroOficio: true,
          asunto: true,
          remitente: true,
          destinatario: true,
          createdAt: true,
          sourceDocumentId: true,
        },
      }),
      prisma.oficio.count({ where }),
    ])

    return NextResponse.json({
      data: oficios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    logger.error("Error listing oficios:", error)
    return NextResponse.json({ error: "Failed to fetch oficios" }, { status: 500 })
  }
}
