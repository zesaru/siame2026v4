export interface HojaRemisionRow {
  id: string
  userId: string
  numero: number
  numeroCompleto: string
  siglaUnidad: string
  fecha: Date
  para: string
  remitente: string
  referencia: string | null
  documento: string
  asunto: string
  destino: string
  peso: number | null
  estado: string
  processingStatus: string
  errorMessage: string | null
  filePath: string | null
  fileHash: string | null
  fileMimeType: string | null
  createdAt: Date
  updatedAt: Date
  processedAt: Date | null
}

export interface ListHojasRemisionParams {
  userId: string
  page: number
  limit: number
  search?: string
  estado?: string
}

export interface ListHojasRemisionResultRow {
  hojas: HojaRemisionRow[]
  total: number
}

export interface CreateHojaRemisionInput {
  userId: string
  numero?: number
  numeroCompleto: string
  siglaUnidad: string
  fecha?: string | Date | null
  para: string
  remitente: string
  referencia?: string | null
  documento: string
  asunto: string
  destino: string
  peso?: number | null
  estado?: string
}

export interface UpdateHojaRemisionInput {
  id: string
  userId: string
  numero?: number
  numeroCompleto?: string
  siglaUnidad?: string
  fecha?: string | Date | null
  para?: string
  remitente?: string
  referencia?: string | null
  documento?: string
  asunto?: string
  destino?: string
  peso?: number | null
  estado?: string
}

export interface HojaRemisionRepository {
  listByUser(params: ListHojasRemisionParams): Promise<ListHojasRemisionResultRow>
  getByIdForUser(params: { id: string; userId: string }): Promise<HojaRemisionRow | null>
  createForUser(input: CreateHojaRemisionInput): Promise<HojaRemisionRow>
  updateByIdForUser(input: UpdateHojaRemisionInput): Promise<HojaRemisionRow | null>
  deleteByIdForUser(params: { id: string; userId: string }): Promise<boolean>
}
