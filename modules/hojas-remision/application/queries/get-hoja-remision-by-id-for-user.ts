import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { HojaRemisionRepository, HojaRemisionRow } from "../../domain/repositories"

export class GetHojaRemisionByIdForUserUseCase {
  constructor(private readonly repository: HojaRemisionRepository) {}

  async execute(id: string, userId: string): Promise<Result<HojaRemisionRow | null, ApplicationError>> {
    if (!id || !userId) return err(new ApplicationError("HOJA_REMISION_ID_OR_USER_REQUIRED", "Id and user id are required"))
    try {
      const hoja = await this.repository.getByIdForUser({ id, userId })
      return ok(hoja)
    } catch (cause) {
      return err(new ApplicationError("HOJA_REMISION_GET_FAILED", "Failed to fetch hoja de remision", cause))
    }
  }
}
