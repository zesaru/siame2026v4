import { documentQuerySchema } from "@/lib/schemas/document"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { z } from "zod"

export type DocumentQueryInput = z.infer<typeof documentQuerySchema>

export function parseDocumentQueryParams(payload: unknown): Result<DocumentQueryInput, ApplicationError> {
  const parsed = documentQuerySchema.safeParse(payload)

  if (!parsed.success) {
    return err(new ApplicationError("DOCUMENT_QUERY_VALIDATION_FAILED", "Invalid query parameters", parsed.error.issues))
  }

  return ok(parsed.data)
}
