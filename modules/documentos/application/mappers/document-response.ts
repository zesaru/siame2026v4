import type { DocumentDetailDto, DocumentDetailSource, DocumentListSource, DocumentsListResponseDto } from "../dto"

function toDocumentListItemDto(source: DocumentListSource) {
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
