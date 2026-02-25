import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { DocumentDetailRow, DocumentRepository } from "../../domain/repositories"

export type UpdateDocumentKeyValuePairsOutcome =
  | { status: "updated"; document: DocumentDetailRow }
  | { status: "not_found" }

export class UpdateDocumentKeyValuePairsByIdForUserUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(
    id: string,
    userId: string,
    keyValuePairs: unknown[],
  ): Promise<Result<UpdateDocumentKeyValuePairsOutcome, ApplicationError>> {
    if (!id || !userId) {
      return err(new ApplicationError("DOCUMENT_ID_OR_USER_REQUIRED", "Document id and user id are required"))
    }

    try {
      const updated = await this.documentRepository.updateKeyValuePairsByIdForUser({
        id,
        userId,
        keyValuePairs,
      })

      if (!updated) {
        return ok({ status: "not_found" })
      }

      return ok({ status: "updated", document: updated })
    } catch (cause) {
      return err(new ApplicationError("DOCUMENT_UPDATE_FAILED", "Failed to update document", cause))
    }
  }
}
