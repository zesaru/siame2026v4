import { changePasswordSchema } from "@/lib/schemas/user"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { z } from "zod"

export type ChangePasswordCommandInput = z.infer<typeof changePasswordSchema>

export function parseChangePasswordCommand(
  payload: unknown,
): Result<ChangePasswordCommandInput, ApplicationError> {
  const parsed = changePasswordSchema.safeParse(payload)

  if (!parsed.success) {
    return err(new ApplicationError("USER_VALIDATION_FAILED", "Validation error", parsed.error.errors))
  }

  return ok(parsed.data)
}
