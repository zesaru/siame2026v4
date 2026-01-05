import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { processGuiaValijaFromAzure } from "@/lib/guias-valija-parser"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"
import fs from "fs/promises"

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

    if (documentId) {
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: { filePath: true, fileName: true, userId: true }
        })

        // Verify ownership
        if (document && document.userId === session.user.id && document.filePath) {
          sourceFilePath = document.filePath
          sourceFileBuffer = await fileStorageService.readFile(document.filePath)

          if (sourceFileBuffer) {
            logger.storage('FILE_FOUND', `Document file found: ${document.filePath}`)
          }
        }
      } catch (error) {
        logger.warn(`Error retrieving document file: ${error}`)
      }
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

    // Copy file from Document to GuiaValija location if available
    if (sourceFileBuffer && guia.fechaEnvio) {
      try {
        // Generate new path for GuiaValija
        const fileExtension = sourceFilePath?.split('.').pop() || 'pdf'

        // Convert Buffer to File-like object
        const fileLike = new File([sourceFileBuffer.toString('base64')], fileName || "documento.pdf", {
          type: "application/pdf"
        })

        const saveResult = await fileStorageService.saveFile({
          entityType: 'GUIAENTRADA',
          entityId: guia.id,
          file: fileLike,
          date: guia.fechaEnvio
        })

        if (saveResult.success && saveResult.relativePath) {
          // Update GuiaValija with file path and security metadata (hash, MIME type)
          await prisma.guiaValija.update({
            where: { id: guia.id },
            data: {
              filePath: saveResult.relativePath,
              fileHash: saveResult.fileHash,
              fileMimeType: saveResult.fileMimeType
            }
          })
          logger.storage('FILE_COPIED', `Document -> GuiaValija: ${saveResult.relativePath}`)
          if (saveResult.fileHash) {
            logger.storage('FILE_HASH', `SHA-256: ${saveResult.fileHash.substring(0, 16)}...`)
          }
          if (saveResult.fileMimeType) {
            logger.storage('FILE_MIME', `Detected: ${saveResult.fileMimeType}`)
          }
        }
      } catch (error) {
        logger.error('Error copying file to GuiaValija location:', error)
        // Continue even if file copy fails
      }
    }

    logger.separator('═', 60)
    logger.success('GUÍA DE VALIJA CREADA EXITOSAMENTE')
    console.log(`   Nº Guía:        ${guia.numeroGuia}`)
    console.log(`   Destinatario:   ${guia.destinatarioNombre}`)
    console.log(`   Remitente:      ${guia.remitenteNombre}`)
    console.log(`   Tipo:           ${guia.tipoValija}`)
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
