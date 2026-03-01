export interface DocumentListRow {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  fileExtension: string
  pageCount: number | null
  language: string | null
  tableCount: number | null
  keyValueCount: number | null
  entityCount: number | null
  processingStatus: string
  metadata: unknown
  createdAt: Date
  analyzedAt: Date | null
}

export interface ListDocumentsParams {
  userId: string
  page: number
  limit: number
  search?: string
  reviewStatus?: "pending" | "confirmed" | "rejected"
  documentType?: "guia_valija" | "hoja_remision" | "oficio"
}

export interface ListDocumentsResultRow {
  documents: DocumentListRow[]
  total: number
}

export interface DocumentRepository {
  listDocuments(params: ListDocumentsParams): Promise<ListDocumentsResultRow>
  getDocumentByIdForUser(params: { id: string; userId: string }): Promise<DocumentDetailRow | null>
  deleteDocumentByIdForUser(params: { id: string; userId: string }): Promise<boolean>
  updateKeyValuePairsByIdForUser(params: UpdateDocumentKeyValuePairsParams): Promise<DocumentDetailRow | null>
}

export interface DocumentDetailRow {
  id: string
  userId: string
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  fileExtension: string
  contentText: string | null
  metadata: unknown
  extractedData: unknown
  keyValuePairs: unknown
  tables: unknown
  entities: unknown
  pageCount: number | null
  language: string | null
  tableCount: number | null
  keyValueCount: number | null
  entityCount: number | null
  processingStatus: string
  errorMessage: string | null
  analyzedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UpdateDocumentKeyValuePairsParams {
  id: string
  userId: string
  keyValuePairs: unknown[]
}
