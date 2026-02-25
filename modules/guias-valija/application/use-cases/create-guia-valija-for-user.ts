import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { CreateGuiaValijaForUserParams, GuiaValijaDetailRow, GuiaValijaRepository } from "../../domain/repositories"

export interface CreateGuiaValijaForUserCommand extends CreateGuiaValijaForUserParams {}

export type CreateGuiaValijaForUserOutcome =
  | { status: "created"; guia: GuiaValijaDetailRow }
  | { status: "duplicate_numero_guia" }

export class CreateGuiaValijaForUserUseCase {
  constructor(private readonly guiaValijaRepository: GuiaValijaRepository) {}

  async execute(
    command: CreateGuiaValijaForUserCommand,
  ): Promise<Result<CreateGuiaValijaForUserOutcome, ApplicationError>> {
    if (!command.userId || !command.data.numeroGuia) {
      return err(new ApplicationError("GUIA_REQUIRED_FIELDS", "User id and numeroGuia are required"))
    }

    try {
      const duplicated = await this.guiaValijaRepository.existsByNumeroGuia({
        numeroGuia: command.data.numeroGuia,
      })

      if (duplicated) {
        return ok({ status: "duplicate_numero_guia" })
      }

      const guia = await this.guiaValijaRepository.createForUser(command)
      return ok({ status: "created", guia })
    } catch (cause) {
      return err(new ApplicationError("GUIA_CREATE_FAILED", "Failed to create guia", cause))
    }
  }
}
