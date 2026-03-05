import { describe, expect, it } from "vitest"
import { changePasswordSchema, createUserSchema } from "./user"

describe("user schemas", () => {
  it("accepts create user payload with strong password", () => {
    const parsed = createUserSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "StrongPass123",
      role: "USER",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects weak password on create user", () => {
    const parsed = createUserSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "weakpass",
      role: "USER",
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects change password when new password equals current", () => {
    const parsed = changePasswordSchema.safeParse({
      currentPassword: "SamePassword123",
      newPassword: "SamePassword123",
    })
    expect(parsed.success).toBe(false)
  })
})
