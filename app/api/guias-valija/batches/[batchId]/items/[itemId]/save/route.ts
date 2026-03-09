import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { summarizeGuiaValijaBatch } from "@/lib/guia-valija-batches"
import { ProcessGuiaValijaFromAzureUseCase } from "@/modules/guias-valija/application/use-cases"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ batchId: string; itemId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { batchId, itemId } = await context.params

    const item = await prisma.guiaValijaUploadBatchItem.findFirst({
      where: {
        id: itemId,
        batchId,
        batch: { userId: session.user.id },
      },
      select: {
        id: true,
        documentId: true,
        guiaValijaId: true,
        fileName: true,
        analysisStatus: true,
        analysisResult: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Item de lote no encontrado" }, { status: 404 })
    }

    if (item.analysisStatus === "saved" && item.guiaValijaId) {
      return NextResponse.json({ success: true, guia: { id: item.guiaValijaId }, alreadySaved: true })
    }

    const azureResult = body?.azureResult || item.analysisResult
    if (!azureResult) {
      return NextResponse.json({ error: "El item no tiene un análisis disponible para guardar." }, { status: 400 })
    }

    const useCase = new ProcessGuiaValijaFromAzureUseCase()
    const result = await useCase.execute({
      userId: session.user.id,
      userEmail: session.user.email,
      azureResult,
      fileName: item.fileName,
      documentId: item.documentId || undefined,
    })

    if (!result.ok) {
      await prisma.guiaValijaUploadBatchItem.update({
        where: { id: item.id },
        data: {
          analysisStatus: "failed",
          errorMessage: result.error.message,
          analysisResult: azureResult,
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

      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    await prisma.guiaValijaUploadBatchItem.update({
      where: { id: item.id },
      data: {
        guiaValijaId: result.value.guia.id,
        analysisStatus: "saved",
        errorMessage: null,
        analysisResult: azureResult,
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

    return NextResponse.json(result.value)
  } catch (error) {
    logger.error("Error saving guía de valija batch item", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save batch item" },
      { status: 500 }
    )
  }
}
