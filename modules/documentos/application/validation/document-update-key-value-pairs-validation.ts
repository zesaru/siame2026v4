import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import { z } from "zod"

const updateDocumentKeyValuePairsSchema = z.object({
  keyValuePairs: z.array(z.unknown()),
})

export type UpdateDocumentKeyValuePairsInput = z.infer<typeof updateDocumentKeyValuePairsSchema>

export function parseUpdateDocumentKeyValuePairs(
  payload: unknown,
): Result<UpdateDocumentKeyValuePairsInput, ApplicationError> {
  const parsed = updateDocumentKeyValuePairsSchema.safeParse(payload)

  if (!parsed.success) {
    return err(
      new ApplicationError(
        "DOCUMENT_UPDATE_VALIDATION_FAILED",
        "keyValuePairs must be an array",
        parsed.error.issues,
      ),
    )
  }

  return ok(parsed.data)
}
