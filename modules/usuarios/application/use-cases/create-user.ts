import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { CreatedUserRow, UserRepository } from "../../domain/repositories"
import type { CreateUserCommandInput } from "../validation"

export type CreateUserOutcome =
  | { status: "created"; user: CreatedUserRow }
  | { status: "email_exists" }

export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: CreateUserCommandInput): Promise<Result<CreateUserOutcome, ApplicationError>> {
    try {
      const exists = await this.userRepository.existsByEmail(command.email)
      if (exists) {
        return ok({ status: "email_exists" })
      }

      const user = await this.userRepository.createUser(command)
      return ok({ status: "created", user })
    } catch (cause: any) {
      if (cause?.code === "P2002") {
        return ok({ status: "email_exists" })
      }
      return err(new ApplicationError("USER_CREATE_FAILED", "Failed to create user", cause))
    }
  }
}
