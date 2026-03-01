import type { DocumentDetailDto, DocumentDetailSource, DocumentListSource, DocumentsListResponseDto } from "../dto"

function toDocumentListItemDto(source: DocumentListSource) {
  const metadata = (source.metadata || {}) as Record<string, any>
  const analysis = (metadata.analysis || {}) as Record<string, any>

  return {
    id: source.id,
    fileName: source.fileName,
    fileSize: source.fileSize,
    fileType: source.fileType,
    fileExtension: source.fileExtension,
    pageCount: source.pageCount,
    language: source.language,
    tableCount: source.tableCount,
    keyValueCount: source.keyValueCount,
    entityCount: source.entityCount,
    processingStatus: source.processingStatus,
    reviewStatus: typeof metadata.reviewStatus === "string" ? metadata.reviewStatus : null,
    detectedDocumentType: typeof analysis.tipoDocumento === "string" ? analysis.tipoDocumento : null,
    createdAt: source.createdAt,
    analyzedAt: source.analyzedAt,
  }
}

export function toDocumentsListResponseDto(input: {
  documents: DocumentListSource[]
  page: number
  limit: number
  total: number
}): DocumentsListResponseDto {
  return {
    documents: input.documents.map(toDocumentListItemDto),
    pagination: {
      page: input.page,
      limit: input.limit,
      total: input.total,
      totalPages: Math.ceil(input.total / input.limit),
    },
  }
}

export function toDocumentDetailDto(source: DocumentDetailSource): DocumentDetailDto {
  return {
    id: source.id,
    userId: source.userId,
    fileName: source.fileName,
    filePath: source.filePath,
    fileSize: source.fileSize,
    fileType: source.fileType,
    fileExtension: source.fileExtension,
    contentText: source.contentText,
    metadata: source.metadata,
    extractedData: source.extractedData,
    keyValuePairs: source.keyValuePairs,
    tables: source.tables,
    entities: source.entities,
    pageCount: source.pageCount,
    language: source.language,
    tableCount: source.tableCount,
    keyValueCount: source.keyValueCount,
    entityCount: source.entityCount,
    processingStatus: source.processingStatus,
    errorMessage: source.errorMessage,
    analyzedAt: source.analyzedAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}
