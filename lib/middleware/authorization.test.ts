import { describe, expect, it } from "vitest"
import { canAssignRole, canDeleteRecords, canManageUser, hasRole } from "./authorization"

describe("authorization helpers", () => {
  it("allows only admin roles to delete records", () => {
    expect(canDeleteRecords("SUPER_ADMIN")).toBe(true)
    expect(canDeleteRecords("ADMIN")).toBe(true)
    expect(canDeleteRecords("USER")).toBe(false)
  })

  it("keeps existing role assignment rules intact", () => {
    expect(canAssignRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true)
    expect(canAssignRole("ADMIN", "USER")).toBe(true)
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false)
  })

  it("keeps existing user management hierarchy intact", () => {
    expect(canManageUser("SUPER_ADMIN", "ADMIN")).toBe(true)
    expect(canManageUser("ADMIN", "USER")).toBe(true)
    expect(canManageUser("ADMIN", "SUPER_ADMIN")).toBe(false)
    expect(canManageUser("USER", "USER")).toBe(false)
  })

  it("checks explicit role membership", () => {
    expect(hasRole("ADMIN", ["ADMIN", "SUPER_ADMIN"])).toBe(true)
    expect(hasRole("USER", ["ADMIN", "SUPER_ADMIN"])).toBe(false)
  })
})
