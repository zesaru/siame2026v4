import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"

function buildGuiaNumero(base: string | null | undefined) {
  const raw = (base || "").trim()
  if (!raw) return `AUTO-GV-${Date.now()}`
  return raw
}

function buildHojaNumeroCompleto(base: string | null | undefined, numero: number | null | undefined) {
  if (base && base.trim()) return base.trim()
  const n = typeof numero === "number" && Number.isFinite(numero) ? numero : Date.now() % 100000
  return `HR-${n}`
}

function buildOficioNumero(base: string | null | undefined) {
  const raw = (base || "").trim()
  if (!raw) return `OF-${Date.now()}`
  return raw
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const documentId = body?.documentId as string | undefined
    const overrides = (body?.overrides || {}) as Record<string, any>

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: session.user.id },
      select: {
        id: true,
        userId: true,
        fileName: true,
        contentText: true,
        metadata: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const metadata = (document.metadata || {}) as Record<string, any>
    const analysis = metadata.analysis as Record<string, any> | undefined
    if (!analysis) {
      return NextResponse.json({ error: "No analysis found for this document" }, { status: 404 })
    }

    if (analysis.requiresManualReview) {
      return NextResponse.json(
        {
          error: "Document requires manual review before confirmation",
          requiresManualReview: true,
          reviewReason: analysis.reviewReason || null,
        },
        { status: 409 }
      )
    }

    const tipoDocumento = analysis.tipoDocumento as "guia_valija" | "hoja_remision" | "oficio"
    const extractedData = {
      ...(analysis.extractedData || {}),
      ...(overrides.extractedData || {}),
    } as Record<string, any>
    const valijaClassification = {
      ...(analysis.valijaClassification || {}),
      ...(overrides.valijaClassification || {}),
    } as Record<string, any>
    if (metadata.confirmedRecordId && metadata.confirmedRecordType) {
      if (metadata.confirmedRecordType !== "oficio") {
        return NextResponse.json({
          success: true,
          documentId: document.id,
          recordId: metadata.confirmedRecordId,
          recordType: metadata.confirmedRecordType,
          alreadyConfirmed: true,
        })
      }

      const existingOficio = await prisma.oficio.findFirst({
        where: {
          userId: document.userId,
          OR: [
            { id: String(metadata.confirmedRecordId) },
            { sourceDocumentId: document.id },
          ],
        },
        select: { id: true },
      })

      if (existingOficio) {
        return NextResponse.json({
          success: true,
          documentId: document.id,
          recordId: existingOficio.id,
          recordType: "oficio",
          alreadyConfirmed: true,
        })
      }
    }

    let recordId: string | null = null
    let recordType = tipoDocumento

    if (tipoDocumento === "guia_valija") {
      const baseNumero = buildGuiaNumero(extractedData.numeroGuia)
      const guiaNumero = await (async () => {
        const exists = await prisma.guiaValija.findUnique({ where: { numeroGuia: baseNumero }, select: { id: true } })
        if (!exists) return baseNumero
        return `${baseNumero}-${Date.now()}`
      })()

      const tipoValija = valijaClassification?.tipoValija === "SALIDA" ? "SALIDA" : "ENTRADA"
      const isExtraordinaria = Boolean(valijaClassification?.isExtraordinaria)

      const guia = await prisma.guiaValija.create({
        data: {
          userId: document.userId,
          numeroGuia: guiaNumero,
          tipoValija,
          isExtraordinaria,
          estado: "recibido",
          fechaEmision: new Date(),
          observaciones: `Confirmado desde análisis (${analysis.idioma || "N/A"}, ${analysis.direccion || "N/A"})`,
          contenidoTexto: document.contentText || null,
          processedAt: new Date(),
          processingStatus: "completed",
        },
        select: { id: true },
      })
      recordId = guia.id
    } else if (tipoDocumento === "hoja_remision") {
      const numero = Number(extractedData.numero || 0)
      const baseNumeroCompleto = buildHojaNumeroCompleto(extractedData.numeroCompleto, numero)
      const numeroCompleto = await (async () => {
        const exists = await prisma.hojaRemision.findUnique({
          where: { numeroCompleto: baseNumeroCompleto },
          select: { id: true },
        })
        if (!exists) return baseNumeroCompleto
        return `${baseNumeroCompleto}-${Date.now()}`
      })()

      const hoja = await prisma.hojaRemision.create({
        data: {
          userId: document.userId,
          numero: Number.isFinite(numero) ? numero : 0,
          numeroCompleto,
          siglaUnidad: (extractedData.siglaUnidad || "GEN").toString().slice(0, 10),
          para: extractedData.para || "Por asignar",
          remitente: extractedData.remitente || "Por asignar",
          asunto: extractedData.asunto || "Detectado automáticamente",
          documento: document.contentText || document.fileName || "Sin contenido",
          destino: extractedData.destino || "Por asignar",
          estado: "borrador",
          processingStatus: "completed",
          processedAt: new Date(),
        },
        select: { id: true },
      })
      recordId = hoja.id
    } else if (tipoDocumento === "oficio") {
      const baseNumero = buildOficioNumero(
        extractedData.numeroOficio || extractedData.numero || extractedData.codigo || extractedData.codigoOficio
      )
      const numeroOficio = await (async () => {
        const exists = await prisma.oficio.findUnique({
          where: { numeroOficio: baseNumero },
          select: { id: true },
        })
        if (!exists) return baseNumero
        return `${baseNumero}-${Date.now()}`
      })()

      const oficio = await prisma.oficio.create({
        data: {
          userId: document.userId,
          sourceDocumentId: document.id,
          numeroOficio,
          asunto: extractedData.asunto || null,
          remitente: extractedData.remitente || null,
          destinatario: extractedData.destinatario || extractedData.para || null,
          referencia: extractedData.referencia || null,
          contenidoTexto: document.contentText || null,
          processedAt: new Date(),
          metadata: {
            idioma: analysis.idioma || null,
            direccion: analysis.direccion || null,
            extractedData,
          },
        },
        select: { id: true },
      })
      recordType = "oficio"
      recordId = oficio.id
    }

    await prisma.document.update({
      where: { id: document.id },
      data: {
        processingStatus: "completed",
        metadata: {
          ...metadata,
          reviewedAt: new Date().toISOString(),
          reviewedBy: session.user.id,
          reviewStatus: "confirmed",
          confirmedAt: new Date().toISOString(),
          confirmedBy: session.user.id,
          confirmedRecordId: recordId,
          confirmedRecordType: recordType,
        },
      },
    })

    return NextResponse.json({
      success: true,
      documentId: document.id,
      recordId,
      recordType,
      alreadyConfirmed: false,
    })
  } catch (error) {
    logger.error("Document confirm error", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to confirm document analysis",
      },
      { status: 500 }
    )
  }
}
