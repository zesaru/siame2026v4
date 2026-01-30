import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"

// Revalidate documents list every 60 seconds (removed force-dynamic to enable caching)
export const revalidate = 60

// GET /api/documents - List user's documents with pagination
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * limit

    // Build where clause for search
    const where: any = { userId: session.user.id }
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: "insensitive" } },
        { contentText: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get documents and total count in parallel
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          fileExtension: true,
          pageCount: true,
          language: true,
          tableCount: true,
          keyValueCount: true,
          entityCount: true,
          processingStatus: true,
          createdAt: true,
          analyzedAt: true,
        },
      }),
      prisma.document.count({ where }),
    ])

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}
