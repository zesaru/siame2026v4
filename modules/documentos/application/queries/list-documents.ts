import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { DocumentRepository } from "../../domain/repositories"

export interface ListDocumentsQuery {
  userId: string
  page: number
  limit: number
  search?: string
  reviewStatus?: "pending" | "confirmed" | "rejected"
  documentType?: "guia_valija" | "hoja_remision" | "oficio"
}

export class ListDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(query: ListDocumentsQuery): Promise<Result<Awaited<ReturnType<DocumentRepository["listDocuments"]>>, ApplicationError>> {
    if (!query.userId) {
      return err(new ApplicationError("DOCUMENT_USER_ID_REQUIRED", "User id is required"))
    }

    try {
      const result = await this.documentRepository.listDocuments(query)
      return ok(result)
    } catch (cause) {
      return err(new ApplicationError("DOCUMENT_LIST_FAILED", "Failed to fetch documents", cause))
    }
  }
}
