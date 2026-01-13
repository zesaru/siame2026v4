"use server"

import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { hojaRemisionSchema, type HojaRemisionInput } from "./schemas"
import { logger } from "@/lib/logger"
import { fileStorageService } from "@/lib/services/file-storage.service"
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

    logger.separator('─', 70)
    logger.info('⏳ Creando Hoja de Remisión')
    logger.info(`   Número: ${validated.numeroCompleto}`)
    logger.info(`   Usuario: ${session.user.email}`)
    if (file) {
      logger.info(`   Archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
    }
    logger.separator('─', 70)

    // Verificar unicidad de numeroCompleto
    const existing = await prisma.hojaRemision.findUnique({
      where: { numeroCompleto: validated.numeroCompleto }
    })

    if (existing) {
      logger.warn(`⚠️  Ya existe Hoja de Remisión con número: ${validated.numeroCompleto}`)
      return {
        success: false,
        error: `Ya existe una hoja de remisión con el número ${validated.numeroCompleto}`
      }
    }

    // Crear hoja de remisión
    const hoja = await prisma.hojaRemision.create({
      data: {
        userId: session.user.id,
        ...validated,
        processingStatus: "completed",
        processedAt: new Date(),
      },
    })

    // Guardar archivo si se proporciona
    if (file) {
      try {
        const saveResult = await fileStorageService.saveFile({
          entityType: 'HOJAREMISION',
          entityId: hoja.id,
          file: file,
          date: validated.fecha ? new Date(validated.fecha) : new Date()
        })

        if (saveResult.success && saveResult.relativePath) {
          await prisma.hojaRemision.update({
            where: { id: hoja.id },
            data: {
              filePath: saveResult.relativePath,
              fileHash: saveResult.hash,
              fileMimeType: file.type
            }
          })
          logger.storage('FILE_SAVED', `Hoja de Remisión ${hoja.numeroCompleto}: ${saveResult.relativePath}`)
        } else {
          logger.warn('File storage failed:', saveResult.error)
        }
      } catch (error) {
        logger.error('File storage error:', error)
        // Continuar con DB save aunque falle el archivo
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
        error: "Datos inválidos: " + error.errors.map(e => e.message).join(", ")
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

    logger.separator('─', 70)
    logger.info('⏳ Actualizando Hoja de Remisión')
    logger.info(`   ID: ${id}`)
    logger.info(`   Número: ${validated.numeroCompleto}`)
    logger.info(`   Usuario: ${session.user.email}`)
    if (file) {
      logger.info(`   Archivo nuevo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
    }
    logger.separator('─', 70)

    // Verificar que la hoja de remisión existe y pertenece al usuario
    const existing = await prisma.hojaRemision.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
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
        numeroCompleto: validated.numeroCompleto,
        id: { not: id },
      },
    })

    if (duplicateNumber) {
      logger.warn(`⚠️  Ya existe otra Hoja de Remisión con número: ${validated.numeroCompleto}`)
      return {
        success: false,
        error: `Ya existe otra hoja de remisión con el número ${validated.numeroCompleto}`
      }
    }

    // Actualizar hoja de remisión
    const hoja = await prisma.hojaRemision.update({
      where: { id },
      data: {
        ...validated,
        processingStatus: "completed",
        processedAt: new Date(),
      },
    })

    // Guardar archivo nuevo si se proporciona
    if (file) {
      try {
        const saveResult = await fileStorageService.saveFile({
          entityType: 'HOJAREMISION',
          entityId: hoja.id,
          file: file,
          date: validated.fecha ? new Date(validated.fecha) : new Date()
        })

        if (saveResult.success && saveResult.relativePath) {
          await prisma.hojaRemision.update({
            where: { id: hoja.id },
            data: {
              filePath: saveResult.relativePath,
              fileHash: saveResult.hash,
              fileMimeType: file.type
            }
          })
          logger.storage('FILE_UPDATED', `Hoja de Remisión ${hoja.numeroCompleto}: ${saveResult.relativePath}`)
        } else {
          logger.warn('File storage failed:', saveResult.error)
        }
      } catch (error) {
        logger.error('File storage error:', error)
        // Continuar aunque falle el guardado del archivo
      }
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
        error: "Datos inválidos: " + error.errors.map(e => e.message).join(", ")
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
    const hoja = await prisma.hojaRemision.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
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
