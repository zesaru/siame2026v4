"use server"

import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { hojaRemisionSchema, type HojaRemisionInput } from "./schemas"
import { logger } from "@/lib/logger"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { validatePdfFile } from "@/lib/pdf-upload"
import {
  normalizeDescripcionEmpaque,
  splitHojaRemisionNumero,
} from "@/lib/hoja-remision-normalizer"
import { canViewAllRecords } from "@/lib/middleware/authorization"
import { z } from "zod"

/**
 * Crea una nueva Hoja de Remisión
 */
export async function createHojaRemision(
  data: HojaRemisionInput,
  file?: File
): Promise<{ success: boolean; data?: any; error?: string }> {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: "No autorizado" }
  }

  try {
    // Validar datos con Zod
    const validated = hojaRemisionSchema.parse(data)
    const numeroParts = splitHojaRemisionNumero(validated.numeroCompleto)
    const normalizedDescripcionEmpaque = normalizeDescripcionEmpaque(
      validated.descripcionEmpaque || numeroParts.descripcionEmpaque
    )
    const payload = {
      ...validated,
      documento: validated.documento || "",
      numeroCompleto: numeroParts.numeroCompleto,
      descripcionEmpaque: normalizedDescripcionEmpaque || undefined,
    }
    const validatedFile = file ?? null

    if (validatedFile) {
      const pdfValidation = validatePdfFile(validatedFile)
      if (!pdfValidation.ok) {
        return { success: false, error: pdfValidation.error }
      }
    }

    logger.separator('─', 70)
    logger.info('⏳ Creando Hoja de Remisión')
    logger.info(`   Número: ${payload.numeroCompleto}`)
    logger.info(`   Usuario: ${session.user.email}`)
    if (validatedFile) {
      logger.info(`   Archivo: ${validatedFile.name} (${(validatedFile.size / 1024).toFixed(1)} KB)`)
    }
    logger.separator('─', 70)

    // Verificar unicidad de numeroCompleto
    const existing = await prisma.hojaRemision.findUnique({
      where: { numeroCompleto: payload.numeroCompleto }
    })

    if (existing) {
      logger.warn(`⚠️  Ya existe Hoja de Remisión con número: ${payload.numeroCompleto}`)
      return {
        success: false,
        error: `Ya existe una hoja de remisión con el número ${payload.numeroCompleto}`
      }
    }

    // Crear hoja de remisión
    const hoja = await prisma.hojaRemision.create({
      data: {
        userId: session.user.id,
        ...payload,
        processingStatus: "completed",
        processedAt: new Date(),
      },
    })

    // Guardar archivo si se proporciona
    if (validatedFile) {
      try {
        const saveResult = await fileStorageService.saveFile({
          entityType: 'HOJAREMISION',
          entityId: hoja.id,
          file: validatedFile,
          date: validated.fecha ? new Date(validated.fecha) : new Date()
        })

        if (!saveResult.success || !saveResult.relativePath || !saveResult.fileHash) {
          await prisma.hojaRemision.delete({
            where: { id: hoja.id },
          })

          return {
            success: false,
            error: saveResult.error || "No se pudo guardar el archivo PDF."
          }
        }

        const duplicatedByHash = await prisma.hojaRemision.findFirst({
          where: {
            fileHash: saveResult.fileHash,
            id: { not: hoja.id },
          },
          select: { id: true, numeroCompleto: true },
        })

        if (duplicatedByHash) {
          await fileStorageService.deleteFile(saveResult.relativePath)
          await prisma.hojaRemision.delete({
            where: { id: hoja.id },
          })

          return {
            success: false,
            error: `Este PDF ya fue registrado en la hoja ${duplicatedByHash.numeroCompleto}.`
          }
        }

        if (saveResult.success && saveResult.relativePath) {
          await prisma.hojaRemision.update({
            where: { id: hoja.id },
            data: {
              filePath: saveResult.relativePath,
              fileHash: saveResult.fileHash,
              fileMimeType: saveResult.fileMimeType || validatedFile.type
            }
          })
          logger.storage('FILE_SAVED', `Hoja de Remisión ${hoja.numeroCompleto}: ${saveResult.relativePath}`)
        }
      } catch (error) {
        logger.error('File storage error:', error)
        await prisma.hojaRemision.delete({
          where: { id: hoja.id },
        }).catch(() => undefined)
        return {
          success: false,
          error: "No se pudo guardar el archivo PDF."
        }
      }
    }

    logger.success(`✅ Hoja de Remisión creada exitosamente`)
    logger.database('CREATE', `ID: ${hoja.id}, Número: ${hoja.numeroCompleto}`)
    logger.separator('═', 70)

    return { success: true, data: hoja }
  } catch (error) {
    logger.error("Error creando Hoja de Remisión", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos inválidos: " + error.issues.map((issue) => issue.message).join(", ")
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear hoja de remisión"
    }
  }
}

/**
 * Actualiza una Hoja de Remisión existente
 */
export async function updateHojaRemision(
  id: string,
  data: HojaRemisionInput,
  file?: File
): Promise<{ success: boolean; data?: any; error?: string }> {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: "No autorizado" }
  }

  try {
    // Validar datos con Zod
    const validated = hojaRemisionSchema.parse(data)
    const numeroParts = splitHojaRemisionNumero(validated.numeroCompleto)
    const normalizedDescripcionEmpaque = normalizeDescripcionEmpaque(
      validated.descripcionEmpaque || numeroParts.descripcionEmpaque
    )
    const payload = {
      ...validated,
      documento: validated.documento || "",
      numeroCompleto: numeroParts.numeroCompleto,
      descripcionEmpaque: normalizedDescripcionEmpaque || undefined,
    }
    const validatedFile = file ?? null

    if (validatedFile) {
      const pdfValidation = validatePdfFile(validatedFile)
      if (!pdfValidation.ok) {
        return { success: false, error: pdfValidation.error }
      }
    }

    logger.separator('─', 70)
    logger.info('⏳ Actualizando Hoja de Remisión')
    logger.info(`   ID: ${id}`)
    logger.info(`   Número: ${payload.numeroCompleto}`)
    logger.info(`   Usuario: ${session.user.email}`)
    if (validatedFile) {
      logger.info(`   Archivo nuevo: ${validatedFile.name} (${(validatedFile.size / 1024).toFixed(1)} KB)`)
    }
    logger.separator('─', 70)

    const isAdmin = canViewAllRecords(session.user.role)

    // Verificar que la hoja de remisión existe y pertenece al usuario
    const existing = await prisma.hojaRemision.findFirst({
      where: isAdmin ? { id } : { id, userId: session.user.id },
    })

    if (!existing) {
      logger.warn(`⚠️  Hoja de Remisión no encontrada: ${id}`)
      return {
        success: false,
        error: "Hoja de remisión no encontrada"
      }
    }

    // Verificar unicidad de numeroCompleto (excluyendo el registro actual)
    const duplicateNumber = await prisma.hojaRemision.findFirst({
      where: {
        numeroCompleto: payload.numeroCompleto,
        id: { not: id },
      },
    })

    if (duplicateNumber) {
      logger.warn(`⚠️  Ya existe otra Hoja de Remisión con número: ${payload.numeroCompleto}`)
      return {
        success: false,
        error: `Ya existe otra hoja de remisión con el número ${payload.numeroCompleto}`
      }
    }

    let newFileData: { filePath: string; fileHash: string; fileMimeType: string } | null = null

    if (validatedFile) {
      try {
        const saveResult = await fileStorageService.saveFile({
          entityType: 'HOJAREMISION',
          entityId: existing.id,
          file: validatedFile,
          date: validated.fecha ? new Date(validated.fecha) : new Date()
        })

        if (!saveResult.success || !saveResult.relativePath || !saveResult.fileHash) {
          return {
            success: false,
            error: saveResult.error || "No se pudo guardar el archivo PDF."
          }
        }

        const duplicatedByHash = await prisma.hojaRemision.findFirst({
          where: {
            fileHash: saveResult.fileHash,
            id: { not: existing.id },
          },
          select: { id: true, numeroCompleto: true },
        })

        if (duplicatedByHash) {
          await fileStorageService.deleteFile(saveResult.relativePath)
          return {
            success: false,
            error: `Este PDF ya fue registrado en la hoja ${duplicatedByHash.numeroCompleto}.`
          }
        }

        newFileData = {
          filePath: saveResult.relativePath,
          fileHash: saveResult.fileHash,
          fileMimeType: saveResult.fileMimeType || validatedFile.type || "application/pdf",
        }
      } catch (error) {
        logger.error('File storage error:', error)
        return {
          success: false,
          error: "No se pudo guardar el archivo PDF."
        }
      }
    }

    const hoja = await prisma.hojaRemision.update({
      where: { id },
      data: {
        ...payload,
        ...(newFileData || {}),
        processingStatus: "completed",
        processedAt: new Date(),
      },
    })

    if (newFileData) {
      logger.storage('FILE_UPDATED', `Hoja de Remisión ${hoja.numeroCompleto}: ${newFileData.filePath}`)
    }

    logger.success(`✅ Hoja de Remisión actualizada exitosamente`)
    logger.database('UPDATE', `ID: ${hoja.id}, Número: ${hoja.numeroCompleto}`)
    logger.separator('═', 70)

    return { success: true, data: hoja }
  } catch (error) {
    logger.error("Error actualizando Hoja de Remisión", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos inválidos: " + error.issues.map((issue) => issue.message).join(", ")
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar hoja de remisión"
    }
  }
}

/**
 * Obtiene una Hoja de Remisión por ID
 */
export async function getHojaRemision(
  id: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: "No autorizado" }
  }

  try {
    const isAdmin = canViewAllRecords(session.user.role)
    const hoja = await prisma.hojaRemision.findFirst({
      where: isAdmin ? { id } : { id, userId: session.user.id },
    })

    if (!hoja) {
      return {
        success: false,
        error: "Hoja de remisión no encontrada"
      }
    }

    return { success: true, data: hoja }
  } catch (error) {
    logger.error("Error obteniendo Hoja de Remisión", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener hoja de remisión"
    }
  }
}
