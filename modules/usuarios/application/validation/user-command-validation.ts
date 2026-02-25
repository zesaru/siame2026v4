import { createUserSchema } from "@/lib/schemas/user"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { z } from "zod"

export type CreateUserCommandInput = z.infer<typeof createUserSchema>

export function parseCreateUserCommand(payload: unknown): Result<CreateUserCommandInput, ApplicationError> {
  const parsed = createUserSchema.safeParse(payload)

  if (!parsed.success) {
    return err(
      new ApplicationError("USER_VALIDATION_FAILED", "Validation error", parsed.error.errors),
    )
  }

  return ok(parsed.data)
}
