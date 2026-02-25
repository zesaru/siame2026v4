import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { GuiaValijaDetailRow, GuiaValijaRepository, UpdateGuiaValijaForUserParams } from "../../domain/repositories"

export interface UpdateGuiaValijaByIdForUserCommand extends UpdateGuiaValijaForUserParams {}

export type UpdateGuiaValijaByIdForUserOutcome =
  | { status: "updated"; guia: GuiaValijaDetailRow }
  | { status: "not_found" }
  | { status: "duplicate_numero_guia" }

export class UpdateGuiaValijaByIdForUserUseCase {
  constructor(private readonly guiaValijaRepository: GuiaValijaRepository) {}

  async execute(
    command: UpdateGuiaValijaByIdForUserCommand,
  ): Promise<Result<UpdateGuiaValijaByIdForUserOutcome, ApplicationError>> {
    if (!command.id || !command.userId) {
      return err(new ApplicationError("GUIA_ID_OR_USER_REQUIRED", "Guia id and user id are required"))
    }

    try {
      const existing = await this.guiaValijaRepository.findOwnedSummaryById({
        id: command.id,
        userId: command.userId,
      })

      if (!existing) {
        return ok({ status: "not_found" })
      }

      if (command.data.numeroGuia && command.data.numeroGuia !== existing.numeroGuia) {
        const duplicated = await this.guiaValijaRepository.existsByNumeroGuia({
          numeroGuia: command.data.numeroGuia,
        })
        if (duplicated) {
          return ok({ status: "duplicate_numero_guia" })
        }
      }

      const guia = await this.guiaValijaRepository.updateByIdForUser(command)
      return ok({ status: "updated", guia })
    } catch (cause) {
      return err(new ApplicationError("GUIA_UPDATE_FAILED", "Failed to update guia", cause))
    }
  }
}
