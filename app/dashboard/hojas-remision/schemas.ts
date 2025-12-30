import { z } from "zod"

/**
 * Schema de validación para Hoja de Remisión
 */
export const hojaRemisionSchema = z.object({
  numero: z.number().int().min(0, "Número debe ser mayor o igual a 0"),
  numeroCompleto: z.string().min(1, "Número completo es requerido"),
  siglaUnidad: z.string().max(10, "Sigla de unidad máxima 10 caracteres"),
  fecha: z.coerce.date({
    errorMap: () => ({ message: "Fecha inválida" })
  }),
  para: z.string().min(1, "Para (destinatario) es requerido"),
  remitente: z.string().min(1, "Remitente es requerido"),
  referencia: z.string().optional(),
  documento: z.string().optional(),
  asunto: z.string().min(1, "Asunto es requerido"),
  destino: z.string().min(1, "Destino es requerido"),
  peso: z.number().positive().optional(),
  estado: z.enum(["borrador", "enviada", "recibida", "anulada"]).default("borrador"),
})

/**
 * Tipo de datos de entrada para Hoja de Remisión
 */
export type HojaRemisionInput = z.infer<typeof hojaRemisionSchema>
