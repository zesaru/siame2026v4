import { NextRequest, NextResponse } from "next/server"
import { analyzeDocument } from "@/lib/document-intelligence"
import { DocumentAnalyzer } from "@/lib/document-analyzer"
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
    logger.document('DOCUMENT ANALYSIS STARTED', file.name, `${(file.size / 1024).toFixed(2)} KB`)

    // 1. Analizar documento con Azure AI
    const azureResult = await analyzeDocument(file)

    // 2. Analizar tipo de documento con nuestro analizador
    const documentTypeAnalysis = await DocumentAnalyzer.analyze(
      azureResult.content || '',
      azureResult.tables,
      azureResult.keyValuePairs
    )

    // 3. Guardar análisis en base de datos
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileExtension: file.name.split('.').pop() || '',
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
        // Guardar también el análisis de tipo de documento
        analysisData: {
          documentTypeAnalysis,
          azureAnalysis: azureResult,
          processedAt: new Date().toISOString()
        }
      },
    })

    // 4. Crear registro específico según el tipo detectado
    let specificRecord = null
    const { tipoDocumento, idioma, direccion, extractedData } = documentTypeAnalysis

    switch (tipoDocumento) {
      case 'guia_valija':
        specificRecord = await prisma.guiaValija.create({
          data: {
            userId: session.user.id,
            numeroGuia: extractedData.numeroGuia || '',
            tipoValija: direccion.toUpperCase(),
            estado: 'pendiente',
            fechaEmision: extractedData.fechaEmision || new Date(),
            pesoValija: extractedData.peso || 0,
            origenCiudad: '',
            destinoCiudad: '',
            remitenteNombre: '',
            destinatarioNombre: '',
            observaciones: `Detectado automáticamente: ${idioma}, ${direccion}`,
            analysisSource: 'ai_detection',
            documentId: document.id
          }
        })
        break

      case 'hoja_remision':
        specificRecord = await prisma.hojaRemision.create({
          data: {
            userId: session.user.id,
            numeroRemision: extractedData.numeroRemision || '',
            tipo: direccion.toUpperCase(),
            estado: 'pendiente',
            fechaRemision: new Date(),
            destino: extractedData.destinatario || '',
            observaciones: `Detectado automáticamente: ${idioma}, ${direccion}`,
            analysisSource: 'ai_detection',
            documentId: document.id
          }
        })
        break

      case 'nota_diplomatica':
        specificRecord = await prisma.document.create({
          data: {
            userId: session.user.id,
            fileName: file.name,
            fileType: 'nota_diplomatica',
            processingStatus: 'completed',
            contentText: azureResult.content,
            metadata: {
              tipo: 'nota_diplomatica',
              direccion,
              idioma,
              asunto: extractedData.asunto,
              entidadEmisora: extractedData.entidadEmisora,
              detectedAt: new Date().toISOString()
            },
            analysisSource: 'ai_detection'
          }
        })
        break
    }

    // 5. Logging
    logger.success(`Document type analysis completed: ${file.name}`)
    logger.info(`Detected: ${tipoDocumento} - ${direccion} (${idioma})`)
    logger.info(`Confidence: ${Math.round((documentTypeAnalysis.confidence.idioma + documentTypeAnalysis.confidence.tipoDocumento + documentTypeAnalysis.confidence.direccion) / 3 * 100)}%`)
    logger.database('CREATE', `Document saved with ID: ${document.id}`)

    if (specificRecord) {
      logger.database('CREATE', `Specific record created: ${tipoDocumento} ID: ${specificRecord.id}`)
    }

    logger.separator()

    return NextResponse.json({
      documentId: document.id,
      specificRecordId: specificRecord?.id,
      specificRecordType: tipoDocumento,
      analysis: {
        idioma: documentTypeAnalysis.idioma,
        tipoDocumento: documentTypeAnalysis.tipoDocumento,
        direccion: documentTypeAnalysis.direccion,
        confidence: documentTypeAnalysis.confidence,
        extractedData: documentTypeAnalysis.extractedData,
        keyIndicators: documentTypeAnalysis.keyIndicators
      },
      // Mantener compatibilidad con el endpoint original
      ...azureResult,
      recommendation: getRecommendation(tipoDocumento, direccion, idioma)
    })

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

/**
 * Obtiene la recomendación de formulario basada en el análisis
 */
function getRecommendation(
  tipoDocumento: string,
  direccion: string,
  idioma: string
): { title: string; description: string; formPath: string } {

  const directionText = direccion === 'entrada' ? 'Entrada' : 'Salida'

  switch (tipoDocumento) {
    case 'guia_valija':
      return {
        title: `Guía de Valija - ${directionText}`,
        description: `Verificar detalles de la guía de valija ${directionText} detectada como ${idioma}`,
        formPath: '/dashboard/guias-valija/new'
      }

    case 'hoja_remision':
      return {
        title: `Hoja de Remisión - ${directionText}`,
        description: `Verificar detalles de la hoja de remisión ${directionText} detectada como ${idioma}`,
        formPath: '/dashboard/hojas-remision/new'
      }

    case 'nota_diplomatica':
      return {
        title: `Nota Diplomática - ${directionText}`,
        description: `Verificar detalles de la nota diplomática ${directionText} detectada como ${idioma}`,
        formPath: '/documents/notes/new'
      }

    default:
      return {
        title: 'Documento Requiere Revisión Manual',
        description: `No se pudo determinar el tipo de documento (${idioma})`,
        formPath: '/documents/manual-entry'
      }
  }
}