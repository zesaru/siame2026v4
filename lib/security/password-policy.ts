export const PASSWORD_MIN_LENGTH = 12

export const PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener al menos 12 caracteres, incluyendo mayúscula, minúscula y número."

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export function isStrongPassword(value: string): boolean {
  if (typeof value !== "string") return false
  if (value.length < PASSWORD_MIN_LENGTH) return false
  return STRONG_PASSWORD_REGEX.test(value)
}
