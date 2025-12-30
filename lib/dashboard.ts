import { prisma } from "./db"

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

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
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
        where: { userId },
      }),
      prisma.document.count({
        where: {
          userId,
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.document.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.document.count({
        where: {
          userId,
          processingStatus: "completed",
        },
      }),
      prisma.document.count({
        where: {
          userId,
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
        where: { userId },
      }),
      prisma.guiaValija.groupBy({
        by: ["estado"],
        where: { userId },
        _count: true,
      }),
      prisma.guiaValija.groupBy({
        by: ["tipoValija"],
        where: { userId },
        _count: true,
      }),
    ])

    const guiasByStatus: Record<string, number> = {}
    guiasByStatusRaw.forEach((item) => {
      guiasByStatus[item.estado] = item._count
    })

    const guiasByType: Record<string, number> = {}
    guiasByTypeRaw.forEach((item) => {
      guiasByType[item.tipoValija] = item._count
    })

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
        where: { userId },
      }),
      prisma.hojaRemision.groupBy({
        by: ["estado"],
        where: { userId },
        _count: true,
      }),
      prisma.hojaRemision.groupBy({
        by: ["siglaUnidad"],
        where: { userId },
        _count: true,
      }),
    ])

    const hojasByStatus: Record<string, number> = {}
    hojasByStatusRaw.forEach((item) => {
      hojasByStatus[item.estado] = item._count
    })

    const hojasByType: Record<string, number> = {}
    hojasByTypeRaw.forEach((item) => {
      hojasByType[item.siglaUnidad] = item._count
    })

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
    console.error("Error fetching dashboard metrics:", error)
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
}
