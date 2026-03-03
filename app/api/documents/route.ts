import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { ListDocumentsUseCase } from "@/modules/documentos/application/queries"
import { toDocumentsListResponseDto } from "@/modules/documentos/application/mappers"
import { parseDocumentQueryParams } from "@/modules/documentos/application/validation"
import { PrismaDocumentRepository } from "@/modules/documentos/infrastructure"

export const dynamic = "force-dynamic"

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

    const parsedQuery = parseDocumentQueryParams({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      reviewStatus: searchParams.get("reviewStatus") || undefined,
      documentType: searchParams.get("documentType") || undefined,
    })

    if (!parsedQuery.ok) {
      const details = Array.isArray(parsedQuery.error.details)
        ? parsedQuery.error.details.map((issue: any) => ({
            path: Array.isArray(issue.path) ? issue.path.join(".") : "",
            message: issue.message,
          }))
        : parsedQuery.error.details

      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details,
        },
        { status: 400 }
      )
    }

    const { page, limit, search, reviewStatus, documentType } = parsedQuery.value
    const repository = new PrismaDocumentRepository(prisma)
    const useCase = new ListDocumentsUseCase(repository)
    const result = await useCase.execute({
      userId: session.user.id,
      page,
      limit,
      search,
      reviewStatus,
      documentType,
    })

    if (!result.ok) {
      logger.error("Error fetching documents:", result.error)
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      toDocumentsListResponseDto({
        documents: result.value.documents,
        page,
        limit,
        total: result.value.total,
      })
    )
  } catch (error) {
    logger.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}
