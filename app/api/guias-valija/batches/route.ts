import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { isPdfFile, summarizeGuiaValijaBatch } from "@/lib/guia-valija-batches"
import { AnalyzeDocumentFileUseCase } from "@/modules/documentos/application/use-cases"
import { DefaultAzureDocumentAnalysisAdapter } from "@/modules/documentos/infrastructure"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: "Debes seleccionar al menos un archivo PDF." }, { status: 400 })
    }

    if (files.some((file) => !isPdfFile(file))) {
      return NextResponse.json({ error: "Solo se permiten archivos PDF en la carga por lote." }, { status: 400 })
    }

    const batch = await prisma.guiaValijaUploadBatch.create({
      data: {
        userId: session.user.id,
        totalFiles: files.length,
      },
    })

    const analyzeUseCase = new AnalyzeDocumentFileUseCase(new DefaultAzureDocumentAnalysisAdapter())

    for (const [index, file] of files.entries()) {
      const result = await analyzeUseCase.execute({ userId: session.user.id, file })

      if (!result.ok) {
        await prisma.guiaValijaUploadBatchItem.create({
          data: {
            batchId: batch.id,
            sortOrder: index,
            fileName: file.name,
            analysisStatus: "failed",
            errorMessage: result.error.message,
          },
        })
        continue
      }

      const analyzedDocumentId = result.value.documentId as string | undefined
      const document = analyzedDocumentId
        ? await prisma.document.findUnique({
            where: { id: analyzedDocumentId },
            select: { filePath: true },
          })
        : null

      await prisma.guiaValijaUploadBatchItem.create({
        data: {
          batchId: batch.id,
          documentId: analyzedDocumentId,
          sortOrder: index,
          fileName: file.name,
          filePath: document?.filePath || null,
          analysisStatus: "ready_review",
          analysisResult: result.value,
        },
      })
    }

    const items = await prisma.guiaValijaUploadBatchItem.findMany({
      where: { batchId: batch.id },
      orderBy: { sortOrder: "asc" },
    })

    const summary = summarizeGuiaValijaBatch(items)

    const updatedBatch = await prisma.guiaValijaUploadBatch.update({
      where: { id: batch.id },
      data: summary,
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json(updatedBatch, { status: 201 })
  } catch (error) {
    logger.error("Error creating guía de valija batch", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create guía batch" },
      { status: 500 }
    )
  }
}
