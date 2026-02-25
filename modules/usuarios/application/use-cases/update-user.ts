import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { UpdateUserInput, UpdatedUserRow, UserRepository } from "../../domain/repositories"

export type UpdateUserOutcome =
  | { status: "updated"; user: UpdatedUserRow }
  | { status: "not_found" }
  | { status: "email_exists" }

export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string, data: UpdateUserInput): Promise<Result<UpdateUserOutcome, ApplicationError>> {
    if (!id) {
      return err(new ApplicationError("USER_ID_REQUIRED", "User id is required"))
    }

    try {
      const existing = await this.userRepository.getUserById(id)
      if (!existing) {
        return ok({ status: "not_found" })
      }

      if (data.email && data.email !== existing.email) {
        const emailExists = await this.userRepository.existsByEmail(data.email)
        if (emailExists) {
          return ok({ status: "email_exists" })
        }
      }

      const updated = await this.userRepository.updateUser(id, data)
      return ok({ status: "updated", user: updated })
    } catch (cause: any) {
      if (cause?.code === "P2002") {
        return ok({ status: "email_exists" })
      }
      return err(new ApplicationError("USER_UPDATE_FAILED", "Failed to update user", cause))
    }
  }
}
