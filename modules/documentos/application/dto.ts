import type { DocumentDetailRow, DocumentListRow } from "../domain/repositories"

export interface DocumentListItemDto {
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
  reviewStatus: string | null
  detectedDocumentType: string | null
  createdAt: Date
  analyzedAt: Date | null
}

export interface DocumentsPaginationDto {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface DocumentsListResponseDto {
  documents: DocumentListItemDto[]
  pagination: DocumentsPaginationDto
}

export type DocumentListSource = DocumentListRow
export type DocumentDetailSource = DocumentDetailRow

export interface DocumentDetailDto {
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
