import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { DocumentDetailRow, DocumentRepository } from "../../domain/repositories"

export class GetDocumentByIdForUserUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(id: string, userId: string): Promise<Result<DocumentDetailRow | null, ApplicationError>> {
    if (!id || !userId) {
      return err(new ApplicationError("DOCUMENT_ID_OR_USER_REQUIRED", "Document id and user id are required"))
    }

    try {
      const document = await this.documentRepository.getDocumentByIdForUser({ id, userId })
      return ok(document)
    } catch (cause) {
      return err(new ApplicationError("DOCUMENT_GET_FAILED", "Failed to fetch document", cause))
    }
  }
}
