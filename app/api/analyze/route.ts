import { NextRequest, NextResponse } from "next/server"
import { analyzeDocument } from "@/lib/document-intelligence"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

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

    logger.separator()
    logger.document('UPLOAD STARTED', file.name, `${(file.size / 1024).toFixed(2)} KB`)

    // Log de la petición a Azure
    logger.azureRequest(file.name, file.size)
    const startTime = Date.now()

    const result = await analyzeDocument(file)

    const duration = Date.now() - startTime

    // Log de la respuesta de Azure
    logger.azureResponse(result, duration)

    // Log detallado de key-value pairs
    logger.azureKeyValuePairs(result.keyValuePairs)

    // Log detallado de tablas
    logger.azureTables(result.tables)

    logger.separator()

    // Save analysis results to database
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileExtension: file.name.split('.').pop() || '',
        contentText: result.content || null,
        pageCount: result.metadata.pageCount || null,
        language: result.metadata.languages?.[0] || null,
        tableCount: result.tables?.length || 0,
        keyValueCount: result.keyValuePairs?.length || 0,
        entityCount: result.entities?.length || 0,
        tables: result.tables || null,
        keyValuePairs: result.keyValuePairs || null,
        entities: result.entities || null,
        metadata: result.metadata || null,
        processingStatus: "completed",
      },
    })

    logger.database('CREATE', `Document saved with ID: ${document.id}`)
    logger.success(`Document analysis completed: ${file.name}`)
    logger.separator()

    // Check if the document analysis result contains document type detection
    const hasDocumentTypeAnalysis = result.content && (
      result.content.toLowerCase().includes('guía') ||
      result.content.toLowerCase().includes('remisión') ||
      result.content.toLowerCase().includes('nota')
    )

    if (hasDocumentTypeAnalysis) {
      // Redirect to verification page for better UX
      return NextResponse.json({
        redirectTo: `/verify?documentId=${document.id}`,
        message: "Documento analizado correctamente, redirigiendo a verificación",
        documentId: document.id,
        hasAdvancedAnalysis: true
      })
    }

    return NextResponse.json({
      ...result,
      documentId: document.id,
    })
  } catch (error) {
    logger.error("Document analysis error", error)
    logger.separator()
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze document"
      },
      { status: 500 }
    )
  }
}