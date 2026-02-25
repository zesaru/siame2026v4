export interface GuiaValijaListItemRow {
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
  items: Array<{
    id: string
    numeroItem: number
    destinatario: string
    contenido: string
    remitente: string | null
    cantidad: number | null
    peso: number | null
  }>
  precintos: Array<{
    id: string
    precinto: string | null
    precintoCable: string | null
    numeroBolsaTamano: string | null
    guiaAereaNumero: string | null
  }>
  _count: {
    items: number
    precintos: number
  }
}

export interface ListGuiasValijaByUserParams {
  userId: string
}

export interface GuiaValijaRepository {
  listByUser(params: ListGuiasValijaByUserParams): Promise<GuiaValijaListItemRow[]>
  findByIdForUser(params: { id: string; userId: string }): Promise<GuiaValijaDetailRow | null>
  deleteByIdForUser(params: { id: string; userId: string }): Promise<boolean>
  findOwnedSummaryById(params: { id: string; userId: string }): Promise<{ id: string; numeroGuia: string } | null>
  existsByNumeroGuia(params: { numeroGuia: string }): Promise<boolean>
  updateByIdForUser(params: UpdateGuiaValijaForUserParams): Promise<GuiaValijaDetailRow>
  createForUser(params: CreateGuiaValijaForUserParams): Promise<GuiaValijaDetailRow>
}

export interface GuiaValijaDetailRow {
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
  items: Array<{
    id: string
    numeroItem: number
    destinatario: string
    contenido: string
    remitente: string | null
    cantidad: number | null
    peso: number | null
    createdAt: Date
    updatedAt: Date
    guiaValijaId: string
  }>
  precintos: Array<{
    id: string
    guiaValijaId: string
    precinto: string | null
    precintoCable: string | null
    numeroBolsaTamano: string | null
    guiaAereaNumero: string | null
    createdAt: Date
    updatedAt: Date
  }>
}

export interface GuiaValijaUpdateItemInput {
  numeroItem?: number | null
  destinatario?: string | null
  contenido?: string | null
  remitente?: string | null
  cantidad?: number | null
  peso?: number | null
}

export interface UpdateGuiaValijaForUserParams {
  id: string
  userId: string
  data: {
    numeroGuia?: string
    tipoValija?: string
    fechaEmision?: string | Date | null
    fechaEnvio?: string | Date | null
    fechaRecibo?: string | Date | null
    origenCiudad?: string | null
    destinoCiudad?: string | null
    origenPais?: string | null
    destinoPais?: string | null
    remitenteNombre?: string | null
    remitenteCargo?: string | null
    remitenteEmail?: string | null
    destinatarioNombre?: string | null
    destinatarioCargo?: string | null
    destinatarioEmail?: string | null
    pesoValija?: string | number | null
    pesoOficial?: string | number | null
    numeroPaquetes?: string | number | null
    descripcionContenido?: string | null
    observaciones?: string | null
    preparadoPor?: string | null
    revisadoPor?: string | null
    firmaReceptor?: string | null
    estado?: string
    items?: GuiaValijaUpdateItemInput[] | null
  }
}

export interface CreateGuiaValijaForUserParams {
  userId: string
  data: {
    numeroGuia: string
    tipoValija?: string
    fechaEmision?: string | Date | null
    fechaEnvio?: string | Date | null
    fechaRecibo?: string | Date | null
    origenCiudad?: string | null
    destinoCiudad?: string | null
    origenPais?: string | null
    destinoPais?: string | null
    remitenteNombre?: string | null
    remitenteCargo?: string | null
    remitenteEmail?: string | null
    destinatarioNombre?: string | null
    destinatarioCargo?: string | null
    destinatarioEmail?: string | null
    pesoValija?: string | number | null
    pesoOficial?: string | number | null
    numeroPaquetes?: string | number | null
    descripcionContenido?: string | null
    observaciones?: string | null
    preparadoPor?: string | null
    revisadoPor?: string | null
    firmaReceptor?: string | null
    estado?: string
    items?: GuiaValijaUpdateItemInput[] | null
  }
}
