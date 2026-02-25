import type { PrismaClient, Prisma } from "@prisma/client"
import type { CreateHojaRemisionInput, HojaRemisionRepository, UpdateHojaRemisionInput } from "../../domain/repositories"

export class PrismaHojaRemisionRepository implements HojaRemisionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser({ userId, page, limit, search, estado }: { userId: string; page: number; limit: number; search?: string; estado?: string }) {
    const skip = (page - 1) * limit
    const where: Prisma.HojaRemisionWhereInput = { userId }

    if (search) {
      where.OR = [
        { numeroCompleto: { contains: search, mode: "insensitive" } },
        { para: { contains: search, mode: "insensitive" } },
        { remitente: { contains: search, mode: "insensitive" } },
        { destino: { contains: search, mode: "insensitive" } },
        { asunto: { contains: search, mode: "insensitive" } },
      ]
    }

    if (estado) where.estado = estado

    const [hojas, total] = await Promise.all([
      this.prisma.hojaRemision.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      this.prisma.hojaRemision.count({ where }),
    ])

    return { hojas, total }
  }

  async getByIdForUser({ id, userId }: { id: string; userId: string }) {
    return this.prisma.hojaRemision.findFirst({ where: { id, userId } })
  }

  async createForUser(input: CreateHojaRemisionInput) {
    return this.prisma.hojaRemision.create({
      data: {
        userId: input.userId,
        numero: input.numero || 0,
        numeroCompleto: input.numeroCompleto,
        siglaUnidad: input.siglaUnidad,
        fecha: input.fecha ? new Date(input.fecha) : new Date(),
        para: input.para,
        remitente: input.remitente,
        referencia: input.referencia,
        documento: input.documento,
        asunto: input.asunto,
        destino: input.destino,
        peso: input.peso,
        estado: input.estado || "borrador",
      },
    })
  }

  async updateByIdForUser(input: UpdateHojaRemisionInput) {
    const existing = await this.prisma.hojaRemision.findFirst({
      where: { id: input.id, userId: input.userId },
      select: { id: true },
    })
    if (!existing) return null

    return this.prisma.hojaRemision.update({
      where: { id: input.id },
      data: {
        ...(input.numero !== undefined && { numero: input.numero }),
        ...(input.numeroCompleto && { numeroCompleto: input.numeroCompleto }),
        ...(input.siglaUnidad && { siglaUnidad: input.siglaUnidad }),
        ...(input.fecha && { fecha: new Date(input.fecha) }),
        ...(input.para !== undefined && { para: input.para }),
        ...(input.remitente !== undefined && { remitente: input.remitente }),
        ...(input.referencia !== undefined && { referencia: input.referencia }),
        ...(input.documento !== undefined && { documento: input.documento }),
        ...(input.asunto !== undefined && { asunto: input.asunto }),
        ...(input.destino !== undefined && { destino: input.destino }),
        ...(input.peso !== undefined && { peso: input.peso }),
        ...(input.estado && { estado: input.estado }),
      },
    })
  }

  async deleteByIdForUser({ id, userId }: { id: string; userId: string }) {
    const existing = await this.prisma.hojaRemision.findFirst({
      where: { id, userId },
      select: { id: true },
    })
    if (!existing) return false

    await this.prisma.guiaValijaItem.updateMany({
      where: { hojaRemisionId: id },
      data: { hojaRemisionId: null },
    })

    await this.prisma.hojaRemision.delete({ where: { id } })
    return true
  }
}
