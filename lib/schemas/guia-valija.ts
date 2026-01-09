import { z } from "zod"

/**
 * Schema para validación de items de Guía de Valija
 */
export const guiaValijaItemSchema = z.object({
  numeroItem: z.number({
    required_error: "El número de item es requerido",
    invalid_type_error: "El número debe ser un valor numérico"
  }).min(1, "El número debe ser mayor a 0"),

  destinatario: z.string({
    required_error: "El destinatario es requerido"
  })
    .min(3, "El destinatario debe tener al menos 3 caracteres")
    .max(200, "Máximo 200 caracteres"),

  contenido: z.string({
    required_error: "El contenido es requerido"
  })
    .min(3, "El contenido debe tener al menos 3 caracteres")
    .max(500, "Máximo 500 caracteres"),

  remitente: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  cantidad: z.number({
    invalid_type_error: "La cantidad debe ser un número"
  })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor a 0")
    .optional(),

  peso: z.number({
    invalid_type_error: "El peso debe ser un número"
  })
    .positive("El peso debe ser mayor a 0")
    .max(1000, "El peso no puede exceder 1000 kg")
    .optional()
})

/**
 * Schema Zod para validación de Guía de Valija
 * Proporciona validación en tiempo real con mensajes de error claros y accionables
 */
export const guiaValijaSchema = z.object({
  // ===== Campos Identificativos =====
  numeroGuia: z.string({
    required_error: "El número de guía es requerido"
  })
    .min(3, "El número debe tener al menos 3 caracteres")
    .max(50, "Máximo 50 caracteres"),

  tipoValija: z.enum(["ENTRADA"], {
    required_error: "El tipo de valija es requerido",
    errorMap: () => ({ message: "El tipo debe ser: ENTRADA" })
  }),

  fechaEmision: z.string({
    required_error: "La fecha de emisión es requerida"
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: "Formato de fecha inválido"
  }),

  // ===== Fechas específicas =====
  fechaEnvio: z.string().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Formato de fecha inválido"
  }).optional(),

  fechaRecibo: z.string().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Formato de fecha inválido"
  }).optional(),

  // ===== Ubicaciones =====
  origenCiudad: z.string({
    required_error: "La ciudad de origen es requerida"
  })
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),

  origenPais: z.string({
    required_error: "El país de origen es requerido"
  })
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),

  destinoCiudad: z.string({
    required_error: "La ciudad de destino es requerida"
  })
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),

  destinoPais: z.string({
    required_error: "El país de destino es requerido"
  })
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),

  // ===== Personas =====
  remitenteNombre: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  remitenteCargo: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  remitenteEmail: z.string()
    .email("Formato de email inválido")
    .max(255, "Máximo 255 caracteres")
    .optional()
    .or(z.literal("")),

  destinatarioNombre: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  destinatarioCargo: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  destinatarioEmail: z.string()
    .email("Formato de email inválido")
    .max(255, "Máximo 255 caracteres")
    .optional()
    .or(z.literal("")),

  // ===== Información de Valija =====
  pesoValija: z.number({
    invalid_type_error: "El peso debe ser un número"
  })
    .positive("El peso debe ser mayor a 0")
    .max(1000, "El peso no puede exceder 1000 kg")
    .optional(),

  pesoOficial: z.number({
    invalid_type_error: "El peso oficial debe ser un número"
  })
    .positive("El peso oficial debe ser mayor a 0")
    .max(1000, "El peso oficial no puede exceder 1000 kg")
    .optional(),

  numeroPaquetes: z.number({
    invalid_type_error: "El número de paquetes debe ser un número"
  })
    .int("Debe ser un número entero")
    .positive("Debe ser mayor a 0")
    .max(1000, "Máximo 1000 paquetes")
    .optional(),

  descripcionContenido: z.string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),

  observaciones: z.string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),

  // ===== Personal de Control =====
  preparadoPor: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  revisadoPor: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  firmaReceptor: z.string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("")),

  // ===== Estados =====
  estado: z.enum(["recibido", "en_transito", "entregado", "cancelado"], {
    required_error: "El estado es requerido",
    errorMap: () => ({ message: "Estado debe ser: recibido, en_transito, entregado o cancelado" })
  }),

  // ===== Items (relación) =====
  items: z.array(guiaValijaItemSchema, {
    required_error: "Debe agregar al menos un item"
  })
    .min(1, "Debe agregar al menos un item")
    .max(100, "Máximo 100 items por guía")
})

/**
 * Tipo TypeScript inferido del schema
 */
export type GuiaValijaFormData = z.infer<typeof guiaValijaSchema>

/**
 * Schema para actualización parcial (campos opcionales)
 */
export const guiaValijaUpdateSchema = guiaValijaSchema.partial()

/**
 * Mensajes de error personalizados para campos comunes
 */
export const fieldErrorMessages = {
  numeroGuia: {
    required: "Ingresa el número de guía",
    min: "Mínimo 3 caracteres (ej: GV-2025-001)",
    max: "Máximo 50 caracteres"
  },
  fechaEmision: {
    required: "Selecciona la fecha de emisión",
    invalid: "Formato de fecha inválido"
  },
  origenCiudad: {
    required: "Ingresa la ciudad de origen",
    min: "Mínimo 2 caracteres (ej: Lima)",
    max: "Máximo 100 caracteres"
  },
  origenPais: {
    required: "Ingresa el país de origen",
    min: "Mínimo 2 caracteres (ej: Perú)",
    max: "Máximo 100 caracteres"
  },
  destinoCiudad: {
    required: "Ingresa la ciudad de destino",
    min: "Mínimo 2 caracteres (ej: Tokio)",
    max: "Máximo 100 caracteres"
  },
  destinoPais: {
    required: "Ingresa el país de destino",
    min: "Mínimo 2 caracteres (ej: Japón)",
    max: "Máximo 100 caracteres"
  },
  pesoValija: {
    invalid: "Debe ser un número",
    positive: "El peso debe ser mayor a 0",
    max: "Máximo 1000 kg"
  },
  pesoOficial: {
    invalid: "Debe ser un número",
    positive: "El peso debe ser mayor a 0",
    max: "Máximo 1000 kg"
  },
  numeroPaquetes: {
    invalid: "Debe ser un número entero",
    positive: "Debe ser mayor a 0",
    max: "Máximo 1000 paquetes"
  },
  items: {
    required: "Debes agregar al menos un item",
    min: "Mínimo 1 item",
    max: "Máximo 100 items"
  }
}
