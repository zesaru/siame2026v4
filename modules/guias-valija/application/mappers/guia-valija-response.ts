import type {
  GuiaValijaDetailDto,
  GuiaValijaDetailSource,
  GuiaValijaItemDto,
  GuiaValijaListItemDto,
  GuiaValijaListItemSource,
  GuiaValijaPrecintoDto,
} from "../dto"

function mapItem(item: GuiaValijaListItemSource["items"][number]): GuiaValijaItemDto {
  return {
    id: item.id,
    numeroItem: item.numeroItem,
    destinatario: item.destinatario,
    contenido: item.contenido,
    remitente: item.remitente,
    cantidad: item.cantidad,
    peso: item.peso,
  }
}

function mapPrecinto(
  precinto: GuiaValijaListItemSource["precintos"][number],
): GuiaValijaPrecintoDto {
  return {
    id: precinto.id,
    precinto: precinto.precinto,
    precintoCable: precinto.precintoCable,
    numeroBolsaTamano: precinto.numeroBolsaTamano,
    guiaAereaNumero: precinto.guiaAereaNumero,
  }
}

export function toGuiaValijaListItemDto(source: GuiaValijaListItemSource): GuiaValijaListItemDto {
  return {
    id: source.id,
    numeroGuia: source.numeroGuia,
    fechaEmision: source.fechaEmision,
    tipoValija: source.tipoValija,
    isExtraordinaria: source.isExtraordinaria,
    fechaEnvio: source.fechaEnvio,
    fechaRecibo: source.fechaRecibo,
    origenCiudad: source.origenCiudad,
    destinoCiudad: source.destinoCiudad,
    origenPais: source.origenPais,
    destinoPais: source.destinoPais,
    destinatarioNombre: source.destinatarioNombre,
    remitenteNombre: source.remitenteNombre,
    pesoValija: source.pesoValija,
    numeroPaquetes: source.numeroPaquetes,
    estado: source.estado,
    processingStatus: source.processingStatus,
    filePath: source.filePath,
    fileMimeType: source.fileMimeType,
    userId: source.userId,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    items: source.items.map(mapItem),
    precintos: source.precintos.map(mapPrecinto),
    _count: source._count,
  }
}

export function toGuiaValijaListDto(sources: GuiaValijaListItemSource[]): GuiaValijaListItemDto[] {
  return sources.map(toGuiaValijaListItemDto)
}

export function toGuiaValijaDetailDto(source: GuiaValijaDetailSource): GuiaValijaDetailDto {
  return {
    id: source.id,
    numeroGuia: source.numeroGuia,
    userId: source.userId,
    tipoValija: source.tipoValija,
    fechaEmision: source.fechaEmision,
    fechaEnvio: source.fechaEnvio,
    fechaRecibo: source.fechaRecibo,
    origenCiudad: source.origenCiudad,
    destinoCiudad: source.destinoCiudad,
    origenPais: source.origenPais,
    destinoPais: source.destinoPais,
    remitenteNombre: source.remitenteNombre,
    remitenteCargo: source.remitenteCargo,
    remitenteEmail: source.remitenteEmail,
    destinatarioNombre: source.destinatarioNombre,
    destinatarioCargo: source.destinatarioCargo,
    destinatarioEmail: source.destinatarioEmail,
    pesoValija: source.pesoValija,
    pesoOficial: source.pesoOficial,
    numeroPaquetes: source.numeroPaquetes,
    descripcionContenido: source.descripcionContenido,
    observaciones: source.observaciones,
    preparadoPor: source.preparadoPor,
    revisadoPor: source.revisadoPor,
    firmaReceptor: source.firmaReceptor,
    estado: source.estado,
    processingStatus: source.processingStatus,
    filePath: source.filePath,
    fileMimeType: source.fileMimeType,
    isExtraordinaria: source.isExtraordinaria,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    items: source.items.map((item) => ({
      ...mapItem(item),
      guiaValijaId: item.guiaValijaId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    precintos: source.precintos.map((precinto) => ({
      ...mapPrecinto(precinto),
      guiaValijaId: precinto.guiaValijaId,
      createdAt: precinto.createdAt,
      updatedAt: precinto.updatedAt,
    })),
  }
}
