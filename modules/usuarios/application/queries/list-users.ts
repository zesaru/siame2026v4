import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { UserListRow, UserRepository } from "../../domain/repositories"

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<Result<UserListRow[], ApplicationError>> {
    try {
      const users = await this.userRepository.listUsers()
      return ok(users)
    } catch (cause) {
      return err(new ApplicationError("USERS_LIST_FAILED", "Failed to list users", cause))
    }
  }
}
