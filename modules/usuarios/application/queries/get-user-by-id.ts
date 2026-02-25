import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { UserDetailRow, UserRepository } from "../../domain/repositories"

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<Result<UserDetailRow | null, ApplicationError>> {
    if (!id) {
      return err(new ApplicationError("USER_ID_REQUIRED", "User id is required"))
    }

    try {
      const user = await this.userRepository.getUserById(id)
      return ok(user)
    } catch (cause) {
      return err(new ApplicationError("USER_GET_FAILED", "Failed to fetch user", cause))
    }
  }
}
