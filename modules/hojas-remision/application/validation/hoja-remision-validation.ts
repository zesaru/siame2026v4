import { z } from "zod"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional().default(""),
  estado: z.string().optional().default(""),
})

const createSchema = z.object({
  numero: z.coerce.number().int().nonnegative().optional(),
  numeroCompleto: z.string().min(1, "numeroCompleto is required"),
  siglaUnidad: z.string().min(1, "siglaUnidad is required (max 10 chars)").max(10, "siglaUnidad is required (max 10 chars)"),
  fecha: z.union([z.string(), z.date()]).optional().nullable(),
  para: z.string().min(1, "para and remitente are required"),
  remitente: z.string().min(1, "para and remitente are required"),
  referencia: z.string().optional().nullable(),
  documento: z.string().min(1, "documento, asunto, and destino are required"),
  asunto: z.string().min(1, "documento, asunto, and destino are required"),
  destino: z.string().min(1, "documento, asunto, and destino are required"),
  peso: z.coerce.number().optional().nullable(),
  estado: z.string().optional(),
})

const updateSchema = z.object({
  numero: z.coerce.number().int().nonnegative().optional(),
  numeroCompleto: z.string().min(1).optional(),
  siglaUnidad: z.string().max(10).optional(),
  fecha: z.union([z.string(), z.date()]).optional().nullable(),
  para: z.string().optional(),
  remitente: z.string().optional(),
  referencia: z.string().optional().nullable(),
  documento: z.string().optional(),
  asunto: z.string().optional(),
  destino: z.string().optional(),
  peso: z.coerce.number().optional().nullable(),
  estado: z.string().optional(),
})

export type HojasRemisionListQueryInput = z.infer<typeof listQuerySchema>
export type CreateHojaRemisionCommandInput = z.infer<typeof createSchema>
export type UpdateHojaRemisionCommandInput = z.infer<typeof updateSchema>

export function parseHojasRemisionListQuery(payload: unknown): Result<HojasRemisionListQueryInput, ApplicationError> {
  const parsed = listQuerySchema.safeParse(payload)
  if (!parsed.success) return err(new ApplicationError("HOJA_REMISION_QUERY_VALIDATION_FAILED", "Invalid query parameters", parsed.error.issues))
  return ok(parsed.data)
}

export function parseCreateHojaRemisionCommand(payload: unknown): Result<CreateHojaRemisionCommandInput, ApplicationError> {
  const parsed = createSchema.safeParse(payload)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Invalid payload"
    return err(new ApplicationError("HOJA_REMISION_CREATE_VALIDATION_FAILED", msg, parsed.error.issues))
  }
  return ok(parsed.data)
}

export function parseUpdateHojaRemisionCommand(payload: unknown): Result<UpdateHojaRemisionCommandInput, ApplicationError> {
  const parsed = updateSchema.safeParse(payload)
  if (!parsed.success) {
    return err(new ApplicationError("HOJA_REMISION_UPDATE_VALIDATION_FAILED", "Invalid payload", parsed.error.issues))
  }
  return ok(parsed.data)
}
