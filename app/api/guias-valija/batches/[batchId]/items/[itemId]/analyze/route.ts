import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { summarizeGuiaValijaBatch } from "@/lib/guia-valija-batches"
import { DefaultAzureDocumentAnalysisAdapter } from "@/modules/documentos/infrastructure"

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ batchId: string; itemId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 })
  }

  try {
    const { batchId, itemId } = await context.params

    const item = await prisma.guiaValijaUploadBatchItem.findFirst({
      where: {
        id: itemId,
        batchId,
        batch: { userId: session.user.id },
      },
      include: {
        document: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Item de lote no encontrado" }, { status: 404 })
    }

    if (!item.document?.filePath) {
      return NextResponse.json({ error: "El item no tiene un documento fuente para reanalizar." }, { status: 400 })
    }

    const fileBuffer = await fileStorageService.readFile(item.document.filePath)
    if (!fileBuffer) {
      return NextResponse.json({ error: "No se encontró el archivo fuente del item." }, { status: 404 })
    }

    const fileBytes = new Uint8Array(fileBuffer)
    const file = new File([fileBytes], item.document.fileName, {
      type: item.document.fileType || item.document.fileMimeType || "application/pdf",
    })

    const analyzer = new DefaultAzureDocumentAnalysisAdapter()
    const azureResult = await analyzer.analyze(file)

    await prisma.document.update({
      where: { id: item.document.id },
      data: {
        contentText: azureResult.content || null,
        pageCount: azureResult.metadata.pageCount || null,
        language: azureResult.metadata.languages?.[0] || null,
        tableCount: azureResult.tables?.length || 0,
        keyValueCount: azureResult.keyValuePairs?.length || 0,
        entityCount: azureResult.entities?.length || 0,
        tables: azureResult.tables || null,
        keyValuePairs: azureResult.keyValuePairs || null,
        entities: azureResult.entities || null,
        metadata: azureResult.metadata || null,
        processingStatus: "completed",
        errorMessage: null,
      },
    })

    const updatedItem = await prisma.guiaValijaUploadBatchItem.update({
      where: { id: item.id },
      data: {
        analysisStatus: "ready_review",
        errorMessage: null,
        analysisResult: {
          ...azureResult,
          documentId: item.document.id,
        },
      },
    })

    const batchItems = await prisma.guiaValijaUploadBatchItem.findMany({
      where: { batchId },
      select: { analysisStatus: true },
    })

    await prisma.guiaValijaUploadBatch.update({
      where: { id: batchId },
      data: summarizeGuiaValijaBatch(batchItems),
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    logger.error("Error reanalyzing guía de valija batch item", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reanalyze batch item" },
      { status: 500 }
    )
  }
}
