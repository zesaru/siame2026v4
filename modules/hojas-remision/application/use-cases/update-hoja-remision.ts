import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { HojaRemisionRepository, HojaRemisionRow, UpdateHojaRemisionInput } from "../../domain/repositories"

export type UpdateHojaRemisionOutcome =
  | { status: "updated"; hoja: HojaRemisionRow }
  | { status: "not_found" }
  | { status: "duplicate_numero_completo" }

export class UpdateHojaRemisionUseCase {
  constructor(private readonly repository: HojaRemisionRepository) {}

  async execute(input: UpdateHojaRemisionInput): Promise<Result<UpdateHojaRemisionOutcome, ApplicationError>> {
    try {
      const hoja = await this.repository.updateByIdForUser(input)
      if (!hoja) return ok({ status: "not_found" })
      return ok({ status: "updated", hoja })
    } catch (cause: any) {
      if (cause?.code === "P2002") return ok({ status: "duplicate_numero_completo" })
      return err(new ApplicationError("HOJA_REMISION_UPDATE_FAILED", "Failed to update hoja de remision", cause))
    }
  }
}
