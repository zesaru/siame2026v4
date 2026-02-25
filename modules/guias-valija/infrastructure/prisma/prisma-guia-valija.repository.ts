import type { PrismaClient } from "@prisma/client"
import type {
  CreateGuiaValijaForUserParams,
  GuiaValijaRepository,
  UpdateGuiaValijaForUserParams,
} from "../../domain/repositories"

export class PrismaGuiaValijaRepository implements GuiaValijaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser({ userId }: { userId: string }) {
    return this.prisma.guiaValija.findMany({
      where: { userId },
      select: {
        id: true,
        numeroGuia: true,
        fechaEmision: true,
        tipoValija: true,
        isExtraordinaria: true,
        fechaEnvio: true,
        fechaRecibo: true,
        origenCiudad: true,
        destinoCiudad: true,
        origenPais: true,
        destinoPais: true,
        destinatarioNombre: true,
        remitenteNombre: true,
        pesoValija: true,
        numeroPaquetes: true,
        estado: true,
        processingStatus: true,
        filePath: true,
        fileMimeType: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            numeroItem: true,
            destinatario: true,
            contenido: true,
            remitente: true,
            cantidad: true,
            peso: true,
          },
        },
        precintos: {
          select: {
            id: true,
            precinto: true,
            precintoCable: true,
            numeroBolsaTamano: true,
            guiaAereaNumero: true,
          },
        },
        _count: {
          select: {
            items: true,
            precintos: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findByIdForUser({ id, userId }: { id: string; userId: string }) {
    return this.prisma.guiaValija.findFirst({
      where: { id, userId },
      include: {
        items: {
          orderBy: { numeroItem: "asc" },
        },
        precintos: true,
      },
    })
  }

  async deleteByIdForUser({ id, userId }: { id: string; userId: string }) {
    const existing = await this.prisma.guiaValija.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing) {
      return false
    }

    await this.prisma.guiaValija.delete({
      where: { id },
    })

    return true
  }

  async findOwnedSummaryById({ id, userId }: { id: string; userId: string }) {
    return this.prisma.guiaValija.findFirst({
      where: { id, userId },
      select: { id: true, numeroGuia: true },
    })
  }

  async existsByNumeroGuia({ numeroGuia }: { numeroGuia: string }) {
    const row = await this.prisma.guiaValija.findUnique({
      where: { numeroGuia },
      select: { id: true },
    })
    return !!row
  }

  async updateByIdForUser({ id, data }: UpdateGuiaValijaForUserParams) {
    await this.prisma.guiaValija.update({
      where: { id },
      data: {
        numeroGuia: data.numeroGuia,
        tipoValija: data.tipoValija,
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : undefined,
        fechaEnvio: data.fechaEnvio ? new Date(data.fechaEnvio) : undefined,
        fechaRecibo: data.fechaRecibo ? new Date(data.fechaRecibo) : undefined,
        origenCiudad: data.origenCiudad,
        destinoCiudad: data.destinoCiudad,
        origenPais: data.origenPais,
        destinoPais: data.destinoPais,
        remitenteNombre: data.remitenteNombre,
        remitenteCargo: data.remitenteCargo,
        remitenteEmail: data.remitenteEmail,
        destinatarioNombre: data.destinatarioNombre,
        destinatarioCargo: data.destinatarioCargo,
        destinatarioEmail: data.destinatarioEmail,
        pesoValija:
          data.pesoValija !== undefined && data.pesoValija !== null && data.pesoValija !== ""
            ? parseFloat(String(data.pesoValija))
            : undefined,
        pesoOficial:
          data.pesoOficial !== undefined && data.pesoOficial !== null && data.pesoOficial !== ""
            ? parseFloat(String(data.pesoOficial))
            : undefined,
        numeroPaquetes:
          data.numeroPaquetes !== undefined && data.numeroPaquetes !== null && data.numeroPaquetes !== ""
            ? parseInt(String(data.numeroPaquetes))
            : undefined,
        descripcionContenido: data.descripcionContenido,
        observaciones: data.observaciones,
        preparadoPor: data.preparadoPor,
        revisadoPor: data.revisadoPor,
        firmaReceptor: data.firmaReceptor,
        estado: data.estado,
      },
    })

    await this.prisma.guiaValijaItem.deleteMany({
      where: { guiaValijaId: id },
    })

    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      await this.prisma.guiaValijaItem.createMany({
        data: data.items.map((item) => ({
          guiaValijaId: id,
          numeroItem: item.numeroItem || 0,
          destinatario: item.destinatario || "",
          contenido: item.contenido || "",
          remitente: item.remitente || null,
          cantidad: item.cantidad || null,
          peso: item.peso || null,
        })),
      })
    }

    return this.prisma.guiaValija.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          orderBy: { numeroItem: "asc" },
        },
        precintos: true,
      },
    })
  }

  async createForUser({ userId, data }: CreateGuiaValijaForUserParams) {
    const guia = await this.prisma.guiaValija.create({
      data: {
        userId,
        numeroGuia: data.numeroGuia,
        tipoValija: data.tipoValija || "ENTRADA",
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : new Date(),
        fechaEnvio: data.fechaEnvio ? new Date(data.fechaEnvio) : null,
        fechaRecibo: data.fechaRecibo ? new Date(data.fechaRecibo) : null,
        origenCiudad: data.origenCiudad,
        destinoCiudad: data.destinoCiudad,
        origenPais: data.origenPais,
        destinoPais: data.destinoPais,
        remitenteNombre: data.remitenteNombre,
        remitenteCargo: data.remitenteCargo,
        remitenteEmail: data.remitenteEmail,
        destinatarioNombre: data.destinatarioNombre,
        destinatarioCargo: data.destinatarioCargo,
        destinatarioEmail: data.destinatarioEmail,
        pesoValija:
          data.pesoValija !== undefined && data.pesoValija !== null && data.pesoValija !== ""
            ? parseFloat(String(data.pesoValija))
            : null,
        pesoOficial:
          data.pesoOficial !== undefined && data.pesoOficial !== null && data.pesoOficial !== ""
            ? parseFloat(String(data.pesoOficial))
            : null,
        numeroPaquetes:
          data.numeroPaquetes !== undefined && data.numeroPaquetes !== null && data.numeroPaquetes !== ""
            ? parseInt(String(data.numeroPaquetes))
            : null,
        descripcionContenido: data.descripcionContenido,
        observaciones: data.observaciones,
        preparadoPor: data.preparadoPor,
        revisadoPor: data.revisadoPor,
        firmaReceptor: data.firmaReceptor,
        estado: data.estado || "pendiente",
        processingStatus: "completed",
      },
    })

    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      await this.prisma.guiaValijaItem.createMany({
        data: data.items.map((item) => ({
          guiaValijaId: guia.id,
          numeroItem: item.numeroItem || 0,
          destinatario: item.destinatario || "",
          contenido: item.contenido || "",
          remitente: item.remitente || null,
          cantidad: item.cantidad || null,
          peso: item.peso || null,
        })),
      })
    }

    return this.prisma.guiaValija.findUniqueOrThrow({
      where: { id: guia.id },
      include: {
        items: true,
        precintos: true,
      },
    })
  }
}
