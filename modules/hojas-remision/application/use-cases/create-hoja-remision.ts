import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { CreateHojaRemisionInput, HojaRemisionRepository, HojaRemisionRow } from "../../domain/repositories"

export type CreateHojaRemisionOutcome =
  | { status: "created"; hoja: HojaRemisionRow }
  | { status: "duplicate_numero_completo" }

export class CreateHojaRemisionUseCase {
  constructor(private readonly repository: HojaRemisionRepository) {}

  async execute(input: CreateHojaRemisionInput): Promise<Result<CreateHojaRemisionOutcome, ApplicationError>> {
    try {
      const hoja = await this.repository.createForUser(input)
      return ok({ status: "created", hoja })
    } catch (cause: any) {
      if (cause?.code === "P2002") return ok({ status: "duplicate_numero_completo" })
      return err(new ApplicationError("HOJA_REMISION_CREATE_FAILED", "Failed to create hoja de remision", cause))
    }
  }
}
