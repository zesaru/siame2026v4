import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { AnalyzeDocumentTypeFileUseCase } from "@/modules/documentos/application/use-cases"
import {
  DefaultAzureDocumentAnalysisAdapter,
  DefaultDocumentTypeAnalysisAdapter,
} from "@/modules/documentos/infrastructure"

// POST mutations don't need force-dynamic (never cached anyway)

export async function POST(req: NextRequest) {
  // Verify authentication
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    const useCase = new AnalyzeDocumentTypeFileUseCase(
      new DefaultAzureDocumentAnalysisAdapter(),
      new DefaultDocumentTypeAnalysisAdapter(),
    )
    const result = await useCase.execute({ userId: session.user.id, file })

    if (!result.ok) {
      throw result.error.details ?? result.error
    }

    return NextResponse.json(result.value)

  } catch (error) {
    logger.error("Document type analysis error", error)
    logger.separator()
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze document"
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get("documentId")
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        metadata: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const metadata = (document.metadata || {}) as Record<string, any>
    const analysis = metadata.analysis
    const recommendation = metadata.recommendation

    if (!analysis || !recommendation) {
      return NextResponse.json({ error: "No analysis found for this document" }, { status: 404 })
    }

    return NextResponse.json({
      documentId: document.id,
      specificRecordId: null,
      specificRecordType: analysis.tipoDocumento,
      classificationVersion: metadata.classificationVersion || "v1",
      analysis,
      recommendation,
    })
  } catch (error) {
    logger.error("Document type analysis fetch error", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch document analysis"
      },
      { status: 500 }
    )
  }
}
