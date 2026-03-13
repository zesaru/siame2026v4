import { prisma } from "./db"
import { cache } from "react"
import { logger } from "./logger"
import type { Role } from "@prisma/client"

export interface DashboardMetrics {
  documents: {
    total: number
    thisWeek: number
    thisMonth: number
    processingSuccess: number
    processingFailed: number
  }
  guiasValija: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    active: number
  }
  hojasRemision: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    active: number
  }
}

/**
 * Get dashboard metrics with React.cache() for deduplication
 * This prevents duplicate queries within the same request
 */
export const getDashboardMetrics = cache(async ({
  userId,
  role,
}: {
  userId: string
  role: Role
}): Promise<DashboardMetrics> => {
  const now = new Date()
  const whereScope = {}

  // Fix: Correctly calculate start of week (Sunday at 00:00:00)
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  try {
    // ===== Document Metrics =====
    const [
      totalDocuments,
      documentsThisWeek,
      documentsThisMonth,
      documentsCompleted,
      documentsFailed,
    ] = await Promise.all([
      prisma.document.count({
        where: whereScope,
      }),
      prisma.document.count({
        where: {
          ...whereScope,
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.document.count({
        where: {
          ...whereScope,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.document.count({
        where: {
          ...whereScope,
          processingStatus: "completed",
        },
      }),
      prisma.document.count({
        where: {
          ...whereScope,
          processingStatus: "failed",
        },
      }),
    ])

    // ===== Guía de Valija Metrics =====
    const [
      totalGuias,
      guiasByStatusRaw,
      guiasByTypeRaw,
    ] = await Promise.all([
      prisma.guiaValija.count({
        where: whereScope,
      }),
      prisma.guiaValija.groupBy({
        by: ["estado"],
        where: whereScope,
        _count: true,
      }),
      prisma.guiaValija.groupBy({
        by: ["tipoValija"],
        where: whereScope,
        _count: true,
      }),
    ])

    // Optimize: Use Object.fromEntries instead of forEach
    const guiasByStatus = Object.fromEntries(
      guiasByStatusRaw.map(item => [item.estado, item._count])
    )

    const guiasByType = Object.fromEntries(
      guiasByTypeRaw.map(item => [item.tipoValija, item._count])
    )

    const guiasActive =
      (guiasByStatus["pendiente"] || 0) +
      (guiasByStatus["en_transito"] || 0)

    // ===== Hoja de Remisión Metrics =====
    const [
      totalHojas,
      hojasByStatusRaw,
      hojasByTypeRaw,
    ] = await Promise.all([
      prisma.hojaRemision.count({
        where: whereScope,
      }),
      prisma.hojaRemision.groupBy({
        by: ["estado"],
        where: whereScope,
        _count: true,
      }),
      prisma.hojaRemision.groupBy({
        by: ["siglaUnidad"],
        where: whereScope,
        _count: true,
      }),
    ])

    // Optimize: Use Object.fromEntries instead of forEach
    const hojasByStatus = Object.fromEntries(
      hojasByStatusRaw.map(item => [item.estado, item._count])
    )

    const hojasByType = Object.fromEntries(
      hojasByTypeRaw.map(item => [item.siglaUnidad, item._count])
    )

    const hojasActive =
      (hojasByStatus["borrador"] || 0) +
      (hojasByStatus["enviada"] || 0)

    return {
      documents: {
        total: totalDocuments,
        thisWeek: documentsThisWeek,
        thisMonth: documentsThisMonth,
        processingSuccess: documentsCompleted,
        processingFailed: documentsFailed,
      },
      guiasValija: {
        total: totalGuias,
        byStatus: guiasByStatus,
        byType: guiasByType,
        active: guiasActive,
      },
      hojasRemision: {
        total: totalHojas,
        byStatus: hojasByStatus,
        byType: hojasByType,
        active: hojasActive,
      },
    }
  } catch (error) {
    logger.error("Error fetching dashboard metrics:", error)
    // Return empty metrics on error
    return {
      documents: {
        total: 0,
        thisWeek: 0,
        thisMonth: 0,
        processingSuccess: 0,
        processingFailed: 0,
      },
      guiasValija: {
        total: 0,
        byStatus: {},
        byType: {},
        active: 0,
      },
      hojasRemision: {
        total: 0,
        byStatus: {},
        byType: {},
        active: 0,
      },
    }
  }
})
