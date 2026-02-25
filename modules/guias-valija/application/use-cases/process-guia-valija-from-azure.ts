import { processGuiaValijaFromAzure } from "@/lib/guias-valija-parser"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"

export interface ProcessGuiaValijaFromAzureInput {
  userId: string
  userEmail?: string | null
  azureResult: any
  fileName?: string
  documentId?: string
}

export class ProcessGuiaValijaFromAzureUseCase {
  async execute(input: ProcessGuiaValijaFromAzureInput): Promise<Result<any, ApplicationError>> {
    try {
      const { userId, userEmail, azureResult, fileName, documentId } = input

      if (!azureResult) {
        return err(new ApplicationError('GUIA_AZURE_RESULT_REQUIRED', 'azureResult is required'))
      }

      logger.separator()
      logger.document('GUÍA DE VALIJA - PROCESSING STARTED', fileName || 'documento.pdf')
      if (userEmail) logger.info(`Usuario: ${userEmail}`)
      logger.azureKeyValuePairs(azureResult.keyValuePairs)

      let sourceFilePath: string | undefined

      logger.info(`📋 documentId received: ${documentId}`)

      if (documentId) {
        try {
          const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { filePath: true, fileName: true, userId: true },
          })

          logger.info(`📄 Document found in DB: ${JSON.stringify({
            id: documentId,
            found: !!document,
            filePath: document?.filePath,
            userId: document?.userId,
            sessionUserId: userId,
          })}`)

          if (document && document.userId === userId && document.filePath) {
            sourceFilePath = document.filePath
            const sourceFileBuffer = await fileStorageService.readFile(document.filePath)
            if (sourceFileBuffer) {
              logger.storage('FILE_FOUND', `Document file found: ${document.filePath}`)
            }
          } else {
            logger.warn(`⚠️ Document ownership verification failed or no filePath`)
          }
        } catch (error) {
          logger.error(`Error retrieving document file: ${error}`)
        }
      } else {
        logger.warn(`⚠️ No documentId provided in request`)
      }

      const guia = await processGuiaValijaFromAzure(
        azureResult,
        userId,
        fileName || 'documento.pdf',
        undefined,
      )

      if (!guia) {
        throw new Error('Failed to create Guia de Valija')
      }

      logger.info(`🔍 Checking rename conditions: sourceFilePath=${!!sourceFilePath}, fechaEnvio=${!!guia.fechaEnvio}`)

      if (sourceFilePath && guia.fechaEnvio) {
        try {
          logger.info(`✅ Conditions met, proceeding with rename...`)
          const fileExtension = sourceFilePath.split('.').pop() || 'pdf'
          let numeroGuia = guia.numeroGuia?.split('-')[0] || 'XX'
          numeroGuia = numeroGuia.replace('EXT', '')
          const year = guia.fechaEnvio.getFullYear()
          const month = String(guia.fechaEnvio.getMonth() + 1).padStart(2, '0')
          const day = String(guia.fechaEnvio.getDate()).padStart(2, '0')
          const datePart = `${year}${month}${day}`
          const uniqueId = guia.id.substring(0, 8)
          const tipoLabel = guia.isExtraordinaria
            ? `GUÍA DE VALIJA ${numeroGuia} EXTRAORDINARIA ENTRADA`
            : `GUÍA DE VALIJA ${numeroGuia} ENTRADA`
          const targetFileName = `${datePart}${tipoLabel}_${uniqueId}.${fileExtension.toLowerCase()}`
          const directory = `GUIAENTRADA/${year}/${month}`
          const newPath = `${directory}/${targetFileName}`

          logger.info(`📝 Renaming file: ${sourceFilePath} → ${newPath}`)
          const renameResult = await fileStorageService.renameFile(sourceFilePath, newPath)

          if (renameResult.success) {
            await prisma.guiaValija.update({ where: { id: guia.id }, data: { filePath: newPath } })
            logger.storage('FILE_RENAMED', `TEMP -> GUIAENTRADA: ${newPath}`)
            logger.info(`✅ File organized: ${targetFileName}`)
          } else {
            logger.error('❌ Failed to rename file:', renameResult.error)
          }
        } catch (error) {
          logger.error('❌ Error renaming file to GuiaValija location:', error)
        }
      } else {
        logger.warn(`⚠️ Skipping rename - Missing requirements: sourceFilePath=${!!sourceFilePath}, fechaEnvio=${!!guia.fechaEnvio}`)
      }

      logger.separator('═', 60)
      logger.success('GUÍA DE VALIJA CREADA EXITOSAMENTE')
      console.log(`   Nº Guía:        ${guia.numeroGuia}`)
      console.log(`   Tipo:           ${guia.tipoValija}${guia.isExtraordinaria ? ' EXTRAORDINARIA' : ''}`)
      console.log(`   Destinatario:   ${guia.destinatarioNombre}`)
      console.log(`   Remitente:      ${guia.remitenteNombre}`)
      console.log(`   Origen:         ${guia.origenCiudad} (${guia.origenPais})`)
      console.log(`   Destino:        ${guia.destinoCiudad} (${guia.destinoPais})`)
      console.log(`   Fecha Envío:    ${guia.fechaEnvio ? guia.fechaEnvio.toLocaleDateString() : 'N/A'}`)
      console.log(`   Peso Valija:    ${guia.pesoValija || 'N/A'} Kgrs.`)
      console.log(`   Peso Oficial:   ${guia.pesoOficial || 'N/A'} Kgrs.`)
      console.log(`   Items:          ${guia.items?.length || 0}`)
      console.log(`   Precintos:      ${guia.precintos?.length || 0}`)
      logger.separator('═', 60)

      return ok({ success: true, guia, message: 'Guía de valija procesada exitosamente' })
    } catch (cause) {
      return err(new ApplicationError('GUIA_PROCESS_FAILED', 'Failed to process Guía de Valija', cause))
    }
  }
}
