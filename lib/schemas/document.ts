import { z } from "zod"

/**
 * Schema para validación de archivos subidos
 */
export const documentFileSchema = z.instanceof(File, {
  message: "Debe seleccionar un archivo"
}).refine((file) => {
  // Validar extensión
  const allowedExtensions = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'heif', 'html', 'txt']
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext ? allowedExtensions.includes(ext) : false
}, {
  message: "Extensión de archivo no permitida. Usa: PDF, DOCX, XLSX, JPG, PNG"
}).refine((file) => {
  // Validar tamaño (50MB max)
  const maxSize = 50 * 1024 * 1024 // 50MB
  return file.size <= maxSize
}, {
  message: "El archivo excede el tamaño máximo de 50MB"
}).refine((file) => {
  // Validar tamaño mínimo (1KB)
  const minSize = 1024 // 1KB
  return file.size >= minSize
}, {
  message: "El archivo está vacío o es muy pequeño (mínimo 1KB)"
})

/**
 * Schema Zod para validación de Document
 */
export const documentSchema = z.object({
  // El archivo se procesa por separado antes de crear el registro
  fileName: z.string({
    required_error: "El nombre del archivo es requerido"
  })
    .min(1, "El nombre del archivo es requerido")
    .max(255, "Máximo 255 caracteres"),

  fileSize: z.number({
    required_error: "El tamaño del archivo es requerido",
    invalid_type_error: "El tamaño debe ser un número"
  })
    .positive("El tamaño debe ser mayor a 0"),

  fileType: z.string({
    required_error: "El tipo de archivo es requerido"
  }),

  fileExtension: z.string({
    required_error: "La extensión del archivo es requerida"
  }),

  // Metadatos opcionales
  language: z.string().optional(),
  pageCount: z.number().int().positive().optional(),

  // Estadísticas de análisis
  tableCount: z.number().int().min(0).optional(),
  keyValueCount: z.number().int().min(0).optional(),
  entityCount: z.number().int().min(0).optional(),

  // Estado de procesamiento
  processingStatus: z.enum(["pending", "processing", "completed", "failed"], {
    errorMap: () => ({ message: "Estado debe ser: pending, processing, completed o failed" })
  }).default("pending"),

  errorMessage: z.string().optional()
})

/**
 * Tipo TypeScript inferido del schema
 */
export type DocumentFormData = z.infer<typeof documentSchema>

/**
 * Schema para actualización parcial (campos opcionales)
 */
export const documentUpdateSchema = documentSchema.partial()

/**
 * Mensajes de error personalizados para subida de archivos
 */
export const fileUploadErrorMessages = {
  fileRequired: "Debes seleccionar un archivo para analizar",
  fileTooLarge: "El archivo excede el tamaño máximo de 50MB",
  fileTooSmall: "El archivo está vacío o es muy pequeño (mínimo 1KB)",
  invalidExtension: "Extensión no permitida. Usa: PDF, DOCX, XLSX, JPG, PNG",
  invalidType: "El tipo de archivo no está soportado",
  uploadFailed: "Error al subir el archivo. Inténtalo nuevamente.",
  processingFailed: "Error al procesar el documento. Verifica que sea un archivo válido.",
  networkError: "Error de conexión. Verifica tu internet e intétalo nuevamente."
}

/**
 * Helper function para validar archivo antes de subir
 */
export async function validateDocumentFile(file: File): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    // Validar con schema
    await documentFileSchema.parseAsync(file)

    // Validaciones adicionales
    if (file.size === 0) {
      return { valid: false, error: fileUploadErrorMessages.fileTooSmall }
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return { valid: false, error: fileUploadErrorMessages.fileTooLarge }
    }

    const allowedExtensions = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'heif', 'html', 'txt']
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      return { valid: false, error: fileUploadErrorMessages.invalidExtension }
    }

    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { valid: false, error: firstError.message }
    }
    return { valid: false, error: fileUploadErrorMessages.uploadFailed }
  }
}
