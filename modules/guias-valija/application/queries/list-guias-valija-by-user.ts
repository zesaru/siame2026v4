import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { GuiaValijaRepository, GuiaValijaListItemRow } from "../../domain/repositories"

export interface ListGuiasValijaByUserQuery {
  userId: string
}

export class ListGuiasValijaByUserUseCase {
  constructor(private readonly guiaValijaRepository: GuiaValijaRepository) {}

  async execute(
    query: ListGuiasValijaByUserQuery,
  ): Promise<Result<GuiaValijaListItemRow[], ApplicationError>> {
    if (!query.userId) {
      return err(new ApplicationError("GUIAS_USER_ID_REQUIRED", "User id is required"))
    }

    try {
      const guias = await this.guiaValijaRepository.listByUser({ userId: query.userId })
      return ok(guias)
    } catch (cause) {
      return err(
        new ApplicationError(
          "GUIAS_FETCH_FAILED",
          "Failed to fetch guias valija",
          cause,
        ),
      )
    }
  }
}
