import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { processGuiaValijaFromAzure } from "@/lib/guias-valija-parser"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"
import fs from "fs/promises"

// POST mutations don't need force-dynamic (never cached anyway)

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
    const body = await req.json()
    const { azureResult, fileName, documentId } = body

    if (!azureResult) {
      return NextResponse.json(
        { error: "azureResult is required" },
        { status: 400 }
      )
    }

    logger.separator()
    logger.document('GUÍA DE VALIJA - PROCESSING STARTED', fileName || 'documento.pdf')
    logger.info(`Usuario: ${session.user.email}`)

    // Log de los key-value pairs recibidos
    logger.azureKeyValuePairs(azureResult.keyValuePairs)

    // Get document file path if documentId is provided
    let sourceFilePath: string | undefined
    let sourceFileBuffer: Buffer | null | undefined

    logger.info(`📋 documentId received: ${documentId}`)

    if (documentId) {
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: { filePath: true, fileName: true, userId: true }
        })

        logger.info(`📄 Document found in DB: ${JSON.stringify({
          id: documentId,
          found: !!document,
          filePath: document?.filePath,
          userId: document?.userId,
          sessionUserId: session.user.id
        })}`)

        // Verify ownership
        if (document && document.userId === session.user.id && document.filePath) {
          sourceFilePath = document.filePath
          sourceFileBuffer = await fileStorageService.readFile(document.filePath)

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

    // Procesar y guardar la guía de valija
    const guia = await processGuiaValijaFromAzure(
      azureResult,
      session.user.id,
      fileName || "documento.pdf",
      undefined // File parameter - will be handled separately
    )

    if (!guia) {
      throw new Error("Failed to create Guia de Valija")
    }

    // Rename/move file from TEMP to GUIAENTRADA with correct naming
    logger.info(`🔍 Checking rename conditions: sourceFilePath=${!!sourceFilePath}, fechaEnvio=${!!guia.fechaEnvio}`)

    if (sourceFilePath && guia.fechaEnvio) {
      try {
        logger.info(`✅ Conditions met, proceeding with rename...`)

        // Get file extension from source path
        const fileExtension = sourceFilePath.split('.').pop() || 'pdf'

        // Extract guide number (ej: "04-2025" -> "04", "04EXT-2025" -> "04")
        let numeroGuia = guia.numeroGuia?.split('-')[0] || 'XX'
        // Remove "EXT" suffix from number for filename display
        numeroGuia = numeroGuia.replace('EXT', '')

        // Format fechaEnvio as YYYYMMDD
        const year = guia.fechaEnvio.getFullYear()
        const month = String(guia.fechaEnvio.getMonth() + 1).padStart(2, '0')
        const day = String(guia.fechaEnvio.getDate()).padStart(2, '0')
        const datePart = `${year}${month}${day}`

        // Generate filename: YYYYMMDDGUÍA DE VALIJA XX [EXTRAORDINARIA] ENTRADA_ID.pdf
        const uniqueId = guia.id.substring(0, 8)
        const tipoLabel = guia.isExtraordinaria
          ? `GUÍA DE VALIJA ${numeroGuia} EXTRAORDINARIA ENTRADA`
          : `GUÍA DE VALIJA ${numeroGuia} ENTRADA`
        const fileName = `${datePart}${tipoLabel}_${uniqueId}.${fileExtension.toLowerCase()}`

        // Generate directory path: GUIAENTRADA/YYYY/MM/
        const directory = `GUIAENTRADA/${year}/${month}`
        const newPath = `${directory}/${fileName}`

        logger.info(`📝 Renaming file: ${sourceFilePath} → ${newPath}`)

        // Rename/move the file
        const renameResult = await fileStorageService.renameFile(sourceFilePath, newPath)

        if (renameResult.success) {
          // Update GuiaValija with new path
          await prisma.guiaValija.update({
            where: { id: guia.id },
            data: {
              filePath: newPath
            }
          })

          logger.storage('FILE_RENAMED', `TEMP -> GUIAENTRADA: ${newPath}`)
          logger.info(`✅ File organized: ${fileName}`)
        } else {
          logger.error('❌ Failed to rename file:', renameResult.error)
        }
      } catch (error) {
        logger.error('❌ Error renaming file to GuiaValija location:', error)
        // Continue even if rename fails
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

    return NextResponse.json({
      success: true,
      guia,
      message: "Guía de valija procesada exitosamente"
    })
  } catch (error) {
    logger.error("Error processing Guía de Valija", error)
    logger.separator()
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process Guía de Valija",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
