import { updateUserSchema } from "@/lib/schemas/user"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { z } from "zod"

export type UpdateUserCommandInput = z.infer<typeof updateUserSchema>

export function parseUpdateUserCommand(payload: unknown): Result<UpdateUserCommandInput, ApplicationError> {
  const parsed = updateUserSchema.safeParse(payload)

  if (!parsed.success) {
    return err(new ApplicationError("USER_VALIDATION_FAILED", "Validation error", parsed.error.errors))
  }

  return ok(parsed.data)
}
