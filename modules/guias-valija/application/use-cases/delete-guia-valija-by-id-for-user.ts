import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { GuiaValijaRepository } from "../../domain/repositories"

export interface DeleteGuiaValijaByIdForUserCommand {
  id: string
  userId: string
}

export class DeleteGuiaValijaByIdForUserUseCase {
  constructor(private readonly guiaValijaRepository: GuiaValijaRepository) {}

  async execute(
    command: DeleteGuiaValijaByIdForUserCommand,
  ): Promise<Result<{ deleted: boolean }, ApplicationError>> {
    if (!command.id || !command.userId) {
      return err(new ApplicationError("GUIA_ID_OR_USER_REQUIRED", "Guia id and user id are required"))
    }

    try {
      const deleted = await this.guiaValijaRepository.deleteByIdForUser({
        id: command.id,
        userId: command.userId,
      })

      return ok({ deleted })
    } catch (cause) {
      return err(new ApplicationError("GUIA_DELETE_FAILED", "Failed to delete guia", cause))
    }
  }
}
