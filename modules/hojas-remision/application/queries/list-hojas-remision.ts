import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { HojaRemisionRepository, ListHojasRemisionResultRow } from "../../domain/repositories"

export class ListHojasRemisionUseCase {
  constructor(private readonly repository: HojaRemisionRepository) {}

  async execute(input: { userId: string; page: number; limit: number; search?: string; estado?: string }): Promise<Result<ListHojasRemisionResultRow, ApplicationError>> {
    if (!input.userId) return err(new ApplicationError("HOJA_REMISION_USER_REQUIRED", "User id is required"))
    try {
      const result = await this.repository.listByUser(input)
      return ok(result)
    } catch (cause) {
      return err(new ApplicationError("HOJA_REMISION_LIST_FAILED", "Failed to fetch hojas de remision", cause))
    }
  }
}
