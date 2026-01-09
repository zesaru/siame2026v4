import { z } from "zod"

/**
 * Schema Zod para validación de Hoja de Remisión
 * Proporciona validación en tiempo real con mensajes de error claros y accionables
 */
export const hojaRemisionSchema = z.object({
  // ===== Campos Identificativos =====
  numero: z.number({
    required_error: "El número es requerido",
    invalid_type_error: "El número debe ser un valor numérico"
  }).min(1, "El número debe ser mayor a 0"),

  siglaUnidad: z.string({
    required_error: "La sigla de unidad es requerida"
  })
    .min(2, "La sigla debe tener al menos 2 caracteres")
    .max(10, "La sigla no puede exceder 10 caracteres")
    .regex(/^[A-Z0-9-]+$/, "Solo permite mayúsculas, números y guiones"),

  fecha: z.string({
    required_error: "La fecha es requerida"
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: "Formato de fecha inválido"
  }),

  // ===== Campos Diplomáticos =====
  para: z.string({
    required_error: "El destinatario es requerido"
  })
    .min(5, "El destinatario debe tener al menos 5 caracteres")
    .max(500, "El destinatario no puede exceder 500 caracteres"),

  remitente: z.string({
    required_error: "El remitente es requerido"
  })
    .min(5, "El remitente debe tener al menos 5 caracteres")
    .max(500, "El remitente no puede exceder 500 caracteres"),

  referencia: z.string()
    .max(500, "La referencia no puede exceder 500 caracteres")
    .optional()
    .or(z.literal("")),

  documento: z.string({
    required_error: "El documento es requerido"
  })
    .min(10, "El documento debe tener al menos 10 caracteres")
    .max(2000, "El documento no puede exceder 2000 caracteres"),

  asunto: z.string({
    required_error: "El asunto es requerido"
  })
    .min(10, "El asunto debe tener al menos 10 caracteres")
    .max(2000, "El asunto no puede exceder 2000 caracteres"),

  destino: z.string({
    required_error: "El destino es requerido"
  })
    .min(5, "El destino debe tener al menos 5 caracteres")
    .max(2000, "El destino no puede exceder 2000 caracteres"),

  peso: z.number({
    invalid_type_error: "El peso debe ser un valor numérico"
  })
    .positive("El peso debe ser mayor a 0")
    .max(1000, "El peso no puede exceder 1000 kg")
    .optional(),

  // ===== Estados =====
  estado: z.enum(["borrador", "enviada", "recibida", "anulada"], {
    required_error: "El estado es requerido",
    errorMap: () => ({ message: "Estado debe ser: borrador, enviada, recibida o anulada" })
  })
})

/**
 * Tipo TypeScript inferido del schema
 */
export type HojaRemisionFormData = z.infer<typeof hojaRemisionSchema>

/**
 * Schema para actualización parcial (campos opcionales)
 */
export const hojaRemisionUpdateSchema = hojaRemisionSchema.partial()

/**
 * Mensajes de error personalizados para campos comunes
 */
export const fieldErrorMessages = {
  numero: {
    required: "Ingresa el número de hoja de remisión",
    min: "El número debe ser mayor a 0"
  },
  siglaUnidad: {
    required: "Ingresa la sigla de la unidad",
    min: "Mínimo 2 caracteres (ej: HH, 6-HH)",
    format: "Solo mayúsculas, números y guiones"
  },
  para: {
    required: "Ingresa el destinatario",
    min: "Mínimo 5 caracteres (ej: MINISTERIO RR.EE.)",
    max: "Máximo 500 caracteres"
  },
  remitente: {
    required: "Ingresa el remitente",
    min: "Mínimo 5 caracteres",
    max: "Máximo 500 caracteres"
  },
  asunto: {
    required: "Ingresa el asunto",
    min: "Mínimo 10 caracteres. Sé específico.",
    max: "Máximo 2000 caracteres"
  },
  destino: {
    required: "Ingresa el destino",
    min: "Mínimo 5 caracteres",
    max: "Máximo 2000 caracteres"
  },
  peso: {
    invalid: "El peso debe ser un número",
    positive: "El peso debe ser mayor a 0",
    max: "Máximo 1000 kg"
  }
}
