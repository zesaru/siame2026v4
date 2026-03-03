import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logDocumentView, extractIpAddress, extractUserAgent } from "@/lib/services/file-audit.service"
import { GetDocumentByIdForUserUseCase } from "@/modules/documentos/application/queries"
import {
  DeleteDocumentByIdForUserUseCase,
  UpdateDocumentKeyValuePairsByIdForUserUseCase,
} from "@/modules/documentos/application/use-cases"
import { toDocumentDetailDto } from "@/modules/documentos/application/mappers"
import { parseUpdateDocumentKeyValuePairs } from "@/modules/documentos/application/validation"
import { PrismaDocumentRepository } from "@/modules/documentos/infrastructure"

export const dynamic = "force-dynamic"

// GET /api/documents/[id] - Get a specific document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)
    const repository = new PrismaDocumentRepository(prisma)
    const useCase = new GetDocumentByIdForUserUseCase(repository)
    const result = await useCase.execute(id, session.user.id)

    if (!result.ok) {
      console.error("Error fetching document:", result.error)
      return NextResponse.json(
        { error: "Failed to fetch document" },
        { status: 500 }
      )
    }

    const document = result.value

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Log document view (non-blocking)
    logDocumentView({
      userId: session.user.id,
      documentType: 'DOCUMENT',
      documentId: document.id,
      documentTitle: document.fileName,
      ipAddress,
      userAgent
    }).catch(err => console.error('[Audit] Failed to log view:', err))

    return NextResponse.json(toDocumentDetailDto(document))
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id] - Delete a specific document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const repository = new PrismaDocumentRepository(prisma)
    const useCase = new DeleteDocumentByIdForUserUseCase(repository)
    const result = await useCase.execute(id, session.user.id)

    if (!result.ok) {
      console.error("Error deleting document:", result.error)
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      )
    }

    if (result.value.status === "not_found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    console.log(`Document deleted: ${id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}

// PUT /api/documents/[id] - Update document key-value pairs
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const body = await req.json()
    const parsedBody = parseUpdateDocumentKeyValuePairs(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "keyValuePairs must be an array" },
        { status: 400 }
      )
    }
    const repository = new PrismaDocumentRepository(prisma)
    const useCase = new UpdateDocumentKeyValuePairsByIdForUserUseCase(repository)
    const result = await useCase.execute(id, session.user.id, parsedBody.value.keyValuePairs)

    if (!result.ok) {
      console.error("Error updating document:", result.error)
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      )
    }

    if (result.value.status === "not_found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }
    console.log(`Document ${id} updated with ${parsedBody.value.keyValuePairs.length} key-value pairs`)

    return NextResponse.json(toDocumentDetailDto(result.value.document))
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}
