import { describe, expect, it } from "vitest"
import { isStrongPassword, PASSWORD_MIN_LENGTH } from "./password-policy"

describe("password-policy", () => {
  it("accepts strong password with minimum length", () => {
    const value = "Abcd1234Wxyz"
    expect(value.length).toBe(PASSWORD_MIN_LENGTH)
    expect(isStrongPassword(value)).toBe(true)
  })

  it("rejects password shorter than minimum", () => {
    expect(isStrongPassword("Abc123xyz")).toBe(false)
  })

  it("rejects password missing uppercase/lowercase/number", () => {
    expect(isStrongPassword("abcdefghijkl")).toBe(false)
    expect(isStrongPassword("ABCDEFGHIJKL")).toBe(false)
    expect(isStrongPassword("Abcdefghijkl")).toBe(false)
  })
})
