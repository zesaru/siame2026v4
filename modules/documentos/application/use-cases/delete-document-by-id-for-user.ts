import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { DocumentRepository } from "../../domain/repositories"

export type DeleteDocumentByIdForUserOutcome =
  | { status: "deleted" }
  | { status: "not_found" }

export class DeleteDocumentByIdForUserUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(id: string, userId: string): Promise<Result<DeleteDocumentByIdForUserOutcome, ApplicationError>> {
    if (!id || !userId) {
      return err(new ApplicationError("DOCUMENT_ID_OR_USER_REQUIRED", "Document id and user id are required"))
    }

    try {
      const deleted = await this.documentRepository.deleteDocumentByIdForUser({ id, userId })
      return ok(deleted ? { status: "deleted" } : { status: "not_found" })
    } catch (cause) {
      return err(new ApplicationError("DOCUMENT_DELETE_FAILED", "Failed to delete document", cause))
    }
  }
}
