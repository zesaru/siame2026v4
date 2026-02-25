import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { AzureDocumentAnalysisAdapter } from "../../infrastructure/analysis/azure-document-analysis.adapter"

export interface AnalyzeDocumentFileInput {
  userId: string
  file: File
}

export class AnalyzeDocumentFileUseCase {
  constructor(private readonly analyzer: AzureDocumentAnalysisAdapter) {}

  async execute(input: AnalyzeDocumentFileInput): Promise<Result<any, ApplicationError>> {
    try {
      const { userId, file } = input

      logger.separator()
      logger.document('UPLOAD STARTED', file.name, `${(file.size / 1024).toFixed(2)} KB`)
      logger.azureRequest(file.name, file.size)
      const startTime = Date.now()

      const result = await this.analyzer.analyze(file)
      const duration = Date.now() - startTime

      logger.azureResponse(result, duration)
      logger.azureKeyValuePairs(result.keyValuePairs)
      logger.azureTables(result.tables)
      logger.separator()

      const document = await prisma.document.create({
        data: {
          userId,
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
          processingStatus: 'completed',
        },
      })

      try {
        logger.info('Attempting to save file to storage as TEMP...')
        const saveResult = await fileStorageService.saveFile({
          entityType: 'TEMP',
          entityId: document.id,
          file,
          date: new Date(),
        })

        if (saveResult.success && saveResult.relativePath) {
          try {
            await prisma.document.update({
              where: { id: document.id },
              data: {
                filePath: saveResult.relativePath,
                fileHash: saveResult.fileHash,
                fileMimeType: saveResult.fileMimeType,
              },
            })
            logger.storage('FILE_SAVED', saveResult.relativePath)
            if (saveResult.fileHash) logger.storage('FILE_HASH', `SHA-256: ${saveResult.fileHash.substring(0, 16)}...`)
            if (saveResult.fileMimeType) logger.storage('FILE_MIME', `Detected: ${saveResult.fileMimeType}`)
          } catch (updateError: any) {
            if (updateError.code === 'P2002' && updateError.meta?.target?.includes('fileHash')) {
              logger.warn('File hash already exists in database, updating with filePath only')
              await prisma.document.update({
                where: { id: document.id },
                data: {
                  filePath: saveResult.relativePath,
                  fileMimeType: saveResult.fileMimeType,
                },
              })
              logger.storage('FILE_SAVED', `${saveResult.relativePath} (duplicate hash)`)
            } else {
              throw updateError
            }
          }
        } else {
          logger.warn(`File storage failed: ${saveResult.error}`)
        }
      } catch (storageError) {
        logger.error('File storage error:', storageError)
        if (storageError instanceof Error) {
          logger.error('Error message:', storageError.message)
          logger.error('Error stack:', storageError.stack)
        }
      }

      logger.database('CREATE', `Document saved with ID: ${document.id}`)
      logger.success(`Document analysis completed: ${file.name}`)
      logger.separator()

      const hasDocumentTypeAnalysis = result.content && (
        result.content.toLowerCase().includes('guía') ||
        result.content.toLowerCase().includes('remisión') ||
        result.content.toLowerCase().includes('nota')
      )

      return ok({
        ...result,
        documentId: document.id,
        hasDocumentTypeAnalysis,
      })
    } catch (cause) {
      return err(new ApplicationError('DOCUMENT_ANALYZE_FAILED', 'Failed to analyze document', cause))
    }
  }
}
