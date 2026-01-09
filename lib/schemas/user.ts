import { z } from "zod"

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
  .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
  .regex(/[0-9]/, "La contraseña debe contener al menos un número")

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: passwordSchema,
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"], {
    errorMap: () => ({ message: "Rol debe ser SUPER_ADMIN, ADMIN o USER" }),
  }),
})

/**
 * Schema for updating a user
 */
export const updateUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").min(3, "El nombre debe tener al menos 3 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"], {
    errorMap: () => ({ message: "Rol debe ser SUPER_ADMIN, ADMIN o USER" }),
  }).optional(),
})

/**
 * Schema for changing password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: passwordSchema,
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
