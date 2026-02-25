import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { HojaRemisionRepository } from "../../domain/repositories"

export type DeleteHojaRemisionOutcome = { status: "deleted" } | { status: "not_found" }

export class DeleteHojaRemisionUseCase {
  constructor(private readonly repository: HojaRemisionRepository) {}

  async execute(id: string, userId: string): Promise<Result<DeleteHojaRemisionOutcome, ApplicationError>> {
    if (!id || !userId) return err(new ApplicationError("HOJA_REMISION_ID_OR_USER_REQUIRED", "Id and user id are required"))
    try {
      const deleted = await this.repository.deleteByIdForUser({ id, userId })
      return ok(deleted ? { status: "deleted" } : { status: "not_found" })
    } catch (cause) {
      return err(new ApplicationError("HOJA_REMISION_DELETE_FAILED", "Failed to delete hoja de remision", cause))
    }
  }
}
