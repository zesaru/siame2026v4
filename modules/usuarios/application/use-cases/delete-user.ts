import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { UserRepository } from "../../domain/repositories"

export type DeleteUserOutcome =
  | { status: "deleted" }
  | { status: "not_found" }

export class DeleteUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<Result<DeleteUserOutcome, ApplicationError>> {
    if (!id) {
      return err(new ApplicationError("USER_ID_REQUIRED", "User id is required"))
    }

    try {
      const existing = await this.userRepository.getUserById(id)
      if (!existing) {
        return ok({ status: "not_found" })
      }

      await this.userRepository.deleteUser(id)
      return ok({ status: "deleted" })
    } catch (cause) {
      return err(new ApplicationError("USER_DELETE_FAILED", "Failed to delete user", cause))
    }
  }
}
