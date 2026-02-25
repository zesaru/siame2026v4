import type { GuiaValijaDetailRow, GuiaValijaListItemRow } from "../domain/repositories"

export interface GuiaValijaItemDto {
  id: string
  numeroItem: number
  destinatario: string
  contenido: string
  remitente: string | null
  cantidad: number | null
  peso: number | null
}

export interface GuiaValijaPrecintoDto {
  id: string
  precinto: string | null
  precintoCable: string | null
  numeroBolsaTamano: string | null
  guiaAereaNumero: string | null
}

export interface GuiaValijaListItemDto {
  id: string
  numeroGuia: string
  fechaEmision: Date
  tipoValija: string
  isExtraordinaria: boolean | null
  fechaEnvio: Date | null
  fechaRecibo: Date | null
  origenCiudad: string | null
  destinoCiudad: string | null
  origenPais: string | null
  destinoPais: string | null
  destinatarioNombre: string | null
  remitenteNombre: string | null
  pesoValija: number | null
  numeroPaquetes: number | null
  estado: string
  processingStatus: string
  filePath: string | null
  fileMimeType: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  items: GuiaValijaItemDto[]
  precintos: GuiaValijaPrecintoDto[]
  _count: {
    items: number
    precintos: number
  }
}

export interface GuiaValijaDetailDto {
  id: string
  numeroGuia: string
  userId: string
  tipoValija: string
  fechaEmision: Date
  fechaEnvio: Date | null
  fechaRecibo: Date | null
  origenCiudad: string | null
  destinoCiudad: string | null
  origenPais: string | null
  destinoPais: string | null
  remitenteNombre: string | null
  remitenteCargo: string | null
  remitenteEmail: string | null
  destinatarioNombre: string | null
  destinatarioCargo: string | null
  destinatarioEmail: string | null
  pesoValija: number | null
  pesoOficial: number | null
  numeroPaquetes: number | null
  descripcionContenido: string | null
  observaciones: string | null
  preparadoPor: string | null
  revisadoPor: string | null
  firmaReceptor: string | null
  estado: string
  processingStatus: string
  filePath: string | null
  fileMimeType: string | null
  isExtraordinaria: boolean | null
  createdAt: Date
  updatedAt: Date
  items: Array<GuiaValijaItemDto & { guiaValijaId?: string; createdAt?: Date; updatedAt?: Date }>
  precintos: Array<GuiaValijaPrecintoDto & { guiaValijaId?: string; createdAt?: Date; updatedAt?: Date }>
}

export type DashboardGuiaValijaListItem = GuiaValijaListItemDto

export type GuiaValijaListItemSource = GuiaValijaListItemRow
export type GuiaValijaDetailSource = GuiaValijaDetailRow
