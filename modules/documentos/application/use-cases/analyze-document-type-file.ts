import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { AzureDocumentAnalysisAdapter } from "../../infrastructure/analysis/azure-document-analysis.adapter"
import type { DocumentTypeAnalysisAdapter } from "../../infrastructure/analysis/document-type-analysis.adapter"

function getRecommendation(
  tipoDocumento: string,
  direccion: string,
  idioma: string,
  requiresManualReview: boolean
) {
  if (requiresManualReview) {
    return {
      title: 'Documento Requiere Revisión Manual',
      description: `Se detectó baja confianza o mezcla de tipos (${idioma}).`,
      formPath: '/dashboard/documents',
      action: 'manual_review',
    }
  }

  const directionText = direccion === 'entrada' ? 'Entrada' : 'Salida'
  switch (tipoDocumento) {
    case 'guia_valija':
      return {
        title: `Guía de Valija - ${directionText}`,
        description: `Verificar detalles de la guía de valija ${directionText} detectada como ${idioma}`,
        formPath: '/dashboard/guias-valija/new',
        action: 'verify_and_confirm',
      }
    case 'hoja_remision':
      return {
        title: `Hoja de Remisión - ${directionText}`,
        description: `Verificar detalles de la hoja de remisión ${directionText} detectada como ${idioma}`,
        formPath: '/dashboard/hojas-remision/new',
        action: 'verify_and_confirm',
      }
    case 'oficio':
      return {
        title: `Oficio - ${directionText}`,
        description: `Revisar y confirmar datos del oficio detectado como ${idioma}`,
        formPath: '/dashboard/oficios/new',
        action: 'verify_and_confirm',
      }
    default:
      return {
        title: 'Documento Requiere Revisión Manual',
        description: `No se pudo determinar el tipo de documento (${idioma})`,
        formPath: '/dashboard/documents',
        action: 'manual_review',
      }
  }
}

export class AnalyzeDocumentTypeFileUseCase {
  constructor(
    private readonly azureAnalyzer: AzureDocumentAnalysisAdapter,
    private readonly typeAnalyzer: DocumentTypeAnalysisAdapter,
  ) {}

  async execute(input: { userId: string; file: File }): Promise<Result<any, ApplicationError>> {
    try {
      const { userId, file } = input
      logger.separator()
      logger.document('DOCUMENT ANALYSIS STARTED', file.name, `${(file.size / 1024).toFixed(2)} KB`)

      const azureResult = await this.azureAnalyzer.analyze(file)
      const documentTypeAnalysis = await this.typeAnalyzer.analyze(
        azureResult.content || '',
        azureResult.tables,
        azureResult.keyValuePairs,
      )
      const recommendation = getRecommendation(
        documentTypeAnalysis.tipoDocumento,
        documentTypeAnalysis.direccion,
        documentTypeAnalysis.idioma,
        !!documentTypeAnalysis.requiresManualReview
      )

      const document = await prisma.document.create({
        data: {
          userId,
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
          metadata: {
            ...(azureResult.metadata || {}),
            classificationVersion: "v1",
            analysis: {
              idioma: documentTypeAnalysis.idioma,
              tipoDocumento: documentTypeAnalysis.tipoDocumento,
              direccion: documentTypeAnalysis.direccion,
              confidence: documentTypeAnalysis.confidence,
              extractedData: documentTypeAnalysis.extractedData,
              keyIndicators: documentTypeAnalysis.keyIndicators,
              blocks: documentTypeAnalysis.blocks,
              requiresManualReview: documentTypeAnalysis.requiresManualReview,
              reviewReason: documentTypeAnalysis.reviewReason,
              valijaClassification: documentTypeAnalysis.valijaClassification,
            },
            recommendation,
          },
          processingStatus: 'pending_review',
        },
      })

      const { tipoDocumento, idioma, direccion } = documentTypeAnalysis

      logger.success(`Document type analysis completed: ${file.name}`)
      logger.info(`Detected: ${tipoDocumento} - ${direccion} (${idioma})`)
      logger.info(`Confidence: ${Math.round((documentTypeAnalysis.confidence.idioma + documentTypeAnalysis.confidence.tipoDocumento + documentTypeAnalysis.confidence.direccion) / 3 * 100)}%`)
      logger.database('CREATE', `Document saved with ID: ${document.id}`)
      logger.separator()

      return ok({
        classificationVersion: "v1",
        documentId: document.id,
        specificRecordId: null,
        specificRecordType: tipoDocumento,
        analysis: {
          idioma: documentTypeAnalysis.idioma,
          tipoDocumento: documentTypeAnalysis.tipoDocumento,
          direccion: documentTypeAnalysis.direccion,
          confidence: documentTypeAnalysis.confidence,
          extractedData: documentTypeAnalysis.extractedData,
          keyIndicators: documentTypeAnalysis.keyIndicators,
          blocks: documentTypeAnalysis.blocks,
          requiresManualReview: documentTypeAnalysis.requiresManualReview,
          reviewReason: documentTypeAnalysis.reviewReason,
          valijaClassification: documentTypeAnalysis.valijaClassification,
        },
        ...azureResult,
        recommendation,
      })
    } catch (cause) {
      return err(new ApplicationError('DOCUMENT_TYPE_ANALYZE_FAILED', 'Failed to analyze document', cause))
    }
  }
}
