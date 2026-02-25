import { z } from "zod"
import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"

const nullableString = z.string().max(2000).optional().or(z.literal(""))

const itemInputSchema = z.object({
  numeroItem: z.coerce.number().int().positive().optional(),
  destinatario: z.string().min(1).max(200).optional().or(z.literal("")),
  contenido: z.string().min(1).max(500).optional().or(z.literal("")),
  remitente: z.string().max(200).optional().or(z.literal("")),
  cantidad: z.coerce.number().int().positive().optional(),
  peso: z.coerce.number().positive().optional(),
})

const estadoSchema = z.enum(["pendiente", "recibido", "en_transito", "entregado", "cancelado"])

const baseGuiaCommandSchema = z.object({
  numeroGuia: z.string().min(1).max(50),
  tipoValija: z.string().optional(),
  fechaEmision: z.union([z.string(), z.date()]).optional(),
  fechaEnvio: z.union([z.string(), z.date()]).optional().nullable(),
  fechaRecibo: z.union([z.string(), z.date()]).optional().nullable(),
  origenCiudad: z.string().max(100).optional().or(z.literal("")),
  destinoCiudad: z.string().max(100).optional().or(z.literal("")),
  origenPais: z.string().max(100).optional().or(z.literal("")),
  destinoPais: z.string().max(100).optional().or(z.literal("")),
  remitenteNombre: z.string().max(200).optional().or(z.literal("")),
  remitenteCargo: z.string().max(200).optional().or(z.literal("")),
  remitenteEmail: z.string().email().max(255).optional().or(z.literal("")),
  destinatarioNombre: z.string().max(200).optional().or(z.literal("")),
  destinatarioCargo: z.string().max(200).optional().or(z.literal("")),
  destinatarioEmail: z.string().email().max(255).optional().or(z.literal("")),
  pesoValija: z.union([z.coerce.number().positive(), z.literal(""), z.null()]).optional(),
  pesoOficial: z.union([z.coerce.number().positive(), z.literal(""), z.null()]).optional(),
  numeroPaquetes: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
  descripcionContenido: nullableString,
  observaciones: nullableString,
  preparadoPor: z.string().max(200).optional().or(z.literal("")),
  revisadoPor: z.string().max(200).optional().or(z.literal("")),
  firmaReceptor: z.string().max(200).optional().or(z.literal("")),
  estado: estadoSchema.optional(),
  items: z.array(itemInputSchema).optional().nullable(),
})

const createGuiaCommandSchema = baseGuiaCommandSchema.extend({
  numeroGuia: z.string().min(1).max(50),
})

const updateGuiaCommandSchema = baseGuiaCommandSchema.partial()

function normalizeEmptyToUndefined<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = { ...input }
  for (const key of ["fechaEnvio", "fechaRecibo", "fechaEmision"]) {
    if (out[key] === "") out[key] = undefined
  }
  for (const key of ["pesoValija", "pesoOficial", "numeroPaquetes"]) {
    if (out[key] === "") out[key] = undefined
  }
  if (Array.isArray(out.items)) {
    out.items = out.items.map((item) => {
      if (!item || typeof item !== "object") return item
      const next = { ...(item as Record<string, unknown>) }
      for (const key of ["cantidad", "peso", "numeroItem"]) {
        if (next[key] === "") next[key] = undefined
      }
      return next
    })
  }
  return out as T
}

function toValidationError(message: string, error: z.ZodError) {
  return new ApplicationError("GUIA_VALIDATION_FAILED", message, error.flatten())
}

export type CreateGuiaValijaCommandInput = z.infer<typeof createGuiaCommandSchema>
export type UpdateGuiaValijaCommandInput = z.infer<typeof updateGuiaCommandSchema>

export function parseCreateGuiaValijaCommand(
  payload: unknown,
): Result<CreateGuiaValijaCommandInput, ApplicationError> {
  const parsed = createGuiaCommandSchema.safeParse(
    payload && typeof payload === "object" ? normalizeEmptyToUndefined(payload as Record<string, unknown>) : payload,
  )

  if (!parsed.success) {
    return err(toValidationError("Invalid guia create payload", parsed.error))
  }

  return ok(parsed.data)
}

export function parseUpdateGuiaValijaCommand(
  payload: unknown,
): Result<UpdateGuiaValijaCommandInput, ApplicationError> {
  const parsed = updateGuiaCommandSchema.safeParse(
    payload && typeof payload === "object" ? normalizeEmptyToUndefined(payload as Record<string, unknown>) : payload,
  )

  if (!parsed.success) {
    return err(toValidationError("Invalid guia update payload", parsed.error))
  }

  return ok(parsed.data)
}
