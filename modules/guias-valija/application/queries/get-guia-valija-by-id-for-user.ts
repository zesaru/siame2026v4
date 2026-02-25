import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { GuiaValijaDetailRow, GuiaValijaRepository } from "../../domain/repositories"

export interface GetGuiaValijaByIdForUserQuery {
  id: string
  userId: string
}

export class GetGuiaValijaByIdForUserUseCase {
  constructor(private readonly guiaValijaRepository: GuiaValijaRepository) {}

  async execute(
    query: GetGuiaValijaByIdForUserQuery,
  ): Promise<Result<GuiaValijaDetailRow | null, ApplicationError>> {
    if (!query.id || !query.userId) {
      return err(new ApplicationError("GUIA_ID_OR_USER_REQUIRED", "Guia id and user id are required"))
    }

    try {
      const guia = await this.guiaValijaRepository.findByIdForUser({
        id: query.id,
        userId: query.userId,
      })
      return ok(guia)
    } catch (cause) {
      return err(new ApplicationError("GUIA_FETCH_FAILED", "Failed to fetch guia", cause))
    }
  }
}
