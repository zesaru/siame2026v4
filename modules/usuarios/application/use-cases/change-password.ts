import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { UserRepository } from "../../domain/repositories"
import type { ChangePasswordCommandInput } from "../validation"

export type ChangePasswordOutcome =
  | { status: "changed" }
  | { status: "invalid_current_password" }
  | { status: "user_not_found" }

export class ChangePasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    userId: string,
    command: ChangePasswordCommandInput,
  ): Promise<Result<ChangePasswordOutcome, ApplicationError>> {
    if (!userId) {
      return err(new ApplicationError("USER_ID_REQUIRED", "User id is required"))
    }

    try {
      const result = await this.userRepository.changePassword({
        userId,
        currentPassword: command.currentPassword,
        newPassword: command.newPassword,
      })
      return ok({ status: result.status })
    } catch (cause) {
      return err(new ApplicationError("USER_CHANGE_PASSWORD_FAILED", "Failed to change password", cause))
    }
  }
}
