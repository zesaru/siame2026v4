import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { AzureDocumentAnalysisAdapter } from "../../infrastructure/analysis/azure-document-analysis.adapter"
import type { DocumentTypeAnalysisAdapter } from "../../infrastructure/analysis/document-type-analysis.adapter"

function getRecommendation(tipoDocumento: string, direccion: string, idioma: string) {
  const directionText = direccion === 'entrada' ? 'Entrada' : 'Salida'
  switch (tipoDocumento) {
    case 'guia_valija':
      return { title: `Guía de Valija - ${directionText}`, description: `Verificar detalles de la guía de valija ${directionText} detectada como ${idioma}`, formPath: '/dashboard/guias-valija/new' }
    case 'hoja_remision':
      return { title: `Hoja de Remisión - ${directionText}`, description: `Verificar detalles de la hoja de remisión ${directionText} detectada como ${idioma}`, formPath: '/dashboard/hojas-remision/new' }
    case 'nota_diplomatica':
      return { title: `Nota Diplomática - ${directionText}`, description: `Verificar detalles de la nota diplomática ${directionText} detectada como ${idioma}`, formPath: '/documents/notes/new' }
    default:
      return { title: 'Documento Requiere Revisión Manual', description: `No se pudo determinar el tipo de documento (${idioma})`, formPath: '/documents/manual-entry' }
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
          metadata: azureResult.metadata || null,
          processingStatus: 'completed',
        },
      })

      let specificRecord: any = null
      const { tipoDocumento, idioma, direccion, extractedData } = documentTypeAnalysis

      switch (tipoDocumento) {
        case 'guia_valija':
          specificRecord = await prisma.guiaValija.create({
            data: {
              userId,
              numeroGuia: extractedData.numeroGuia || '',
              tipoValija: 'ENTRADA',
              estado: 'pendiente',
              fechaEmision: extractedData.fechaEmision || new Date(),
              pesoValija: extractedData.peso || 0,
              origenCiudad: '',
              destinoCiudad: '',
              remitenteNombre: '',
              destinatarioNombre: '',
              observaciones: `Detectado automáticamente: ${idioma}, ${direccion}`,
            },
          })
          break
        case 'hoja_remision':
          specificRecord = await prisma.hojaRemision.create({
            data: {
              userId,
              numero: extractedData.numero || 0,
              numeroCompleto: extractedData.numeroCompleto || `HR-${Date.now()}`,
              siglaUnidad: extractedData.siglaUnidad || 'HH',
              para: extractedData.para || 'Por Asignar',
              remitente: extractedData.remitente || 'Por Asignar',
              asunto: extractedData.asunto || 'Detectado automáticamente',
              documento: azureResult.content || '',
              destino: 'Por Asignar',
              estado: 'borrador',
              processingStatus: 'completed',
            },
          })
          break
        case 'nota_diplomatica':
          specificRecord = await prisma.document.create({
            data: {
              userId,
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
                detectedAt: new Date().toISOString(),
              },
            },
          })
          break
      }

      logger.success(`Document type analysis completed: ${file.name}`)
      logger.info(`Detected: ${tipoDocumento} - ${direccion} (${idioma})`)
      logger.info(`Confidence: ${Math.round((documentTypeAnalysis.confidence.idioma + documentTypeAnalysis.confidence.tipoDocumento + documentTypeAnalysis.confidence.direccion) / 3 * 100)}%`)
      logger.database('CREATE', `Document saved with ID: ${document.id}`)
      if (specificRecord) logger.database('CREATE', `Specific record created: ${tipoDocumento} ID: ${specificRecord.id}`)
      logger.separator()

      return ok({
        documentId: document.id,
        specificRecordId: specificRecord?.id,
        specificRecordType: tipoDocumento,
        analysis: {
          idioma: documentTypeAnalysis.idioma,
          tipoDocumento: documentTypeAnalysis.tipoDocumento,
          direccion: documentTypeAnalysis.direccion,
          confidence: documentTypeAnalysis.confidence,
          extractedData: documentTypeAnalysis.extractedData,
          keyIndicators: documentTypeAnalysis.keyIndicators,
        },
        ...azureResult,
        recommendation: getRecommendation(tipoDocumento, direccion, idioma),
      })
    } catch (cause) {
      return err(new ApplicationError('DOCUMENT_TYPE_ANALYZE_FAILED', 'Failed to analyze document', cause))
    }
  }
}
