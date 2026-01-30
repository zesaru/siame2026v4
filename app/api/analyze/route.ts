import { NextRequest, NextResponse } from "next/server"
import { analyzeDocument } from "@/lib/document-intelligence"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { fileStorageService } from "@/lib/services/file-storage.service"

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
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    logger.separator()
    logger.document('UPLOAD STARTED', file.name, `${(file.size / 1024).toFixed(2)} KB`)

    // Log de la petición a Azure
    logger.azureRequest(file.name, file.size)
    const startTime = Date.now()

    const result = await analyzeDocument(file)

    const duration = Date.now() - startTime

    // Log de la respuesta de Azure
    logger.azureResponse(result, duration)

    // Log detallado de key-value pairs
    logger.azureKeyValuePairs(result.keyValuePairs)

    // Log detallado de tablas
    logger.azureTables(result.tables)

    logger.separator()

    // Save analysis results to database first
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
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
        processingStatus: "completed",
      },
    })

    // Save file to local storage with actual document ID (TEMPORAL)
    try {
      logger.info('Attempting to save file to storage as TEMP...')
      const saveResult = await fileStorageService.saveFile({
        entityType: 'TEMP',
        entityId: document.id,
        file: file,
        date: new Date()
      })

      if (saveResult.success && saveResult.relativePath) {
        // Update document with file path and security metadata (hash, MIME type)
        try {
          await prisma.document.update({
            where: { id: document.id },
            data: {
              filePath: saveResult.relativePath,
              fileHash: saveResult.fileHash,
              fileMimeType: saveResult.fileMimeType
            }
          })
          logger.storage('FILE_SAVED', saveResult.relativePath)
          if (saveResult.fileHash) {
            logger.storage('FILE_HASH', `SHA-256: ${saveResult.fileHash.substring(0, 16)}...`)
          }
          if (saveResult.fileMimeType) {
            logger.storage('FILE_MIME', `Detected: ${saveResult.fileMimeType}`)
          }
        } catch (updateError: any) {
          // Handle unique constraint on fileHash - file can exist but document record is new
          if (updateError.code === 'P2002' && updateError.meta?.target?.includes('fileHash')) {
            logger.warn('File hash already exists in database, updating with filePath only')
            await prisma.document.update({
              where: { id: document.id },
              data: {
                filePath: saveResult.relativePath,
                fileMimeType: saveResult.fileMimeType
                // Skip fileHash to avoid unique constraint
              }
            })
            logger.storage('FILE_SAVED', `${saveResult.relativePath} (duplicate hash)`)
          } else {
            throw updateError // Re-throw if it's not a unique constraint error
          }
        }
      } else {
        logger.warn(`File storage failed: ${saveResult.error}`)
      }
    } catch (error) {
      logger.error('File storage error:', error)
      if (error instanceof Error) {
        logger.error('Error message:', error.message)
        logger.error('Error stack:', error.stack)
      }
      // Continue even if file storage fails
    }

    logger.database('CREATE', `Document saved with ID: ${document.id}`)
    logger.success(`Document analysis completed: ${file.name}`)
    logger.separator()

    // Check if the document analysis result contains document type detection
    const hasDocumentTypeAnalysis = result.content && (
      result.content.toLowerCase().includes('guía') ||
      result.content.toLowerCase().includes('remisión') ||
      result.content.toLowerCase().includes('nota')
    )

    // Always include the analysis data in the response
    return NextResponse.json({
      ...result,
      documentId: document.id,
      hasDocumentTypeAnalysis,
    })
  } catch (error) {
    logger.error("Document analysis error", error)
    if (error instanceof Error) {
      logger.error("Error message:", error.message)
      logger.error("Error stack:", error.stack)
    }
    logger.separator()

    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : "Failed to analyze document"

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}