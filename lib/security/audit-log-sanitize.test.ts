import { describe, expect, it } from "vitest"
import { buildAuthAuditTitle, sanitizeAuditDetail, sanitizeAuditPathSegment } from "./audit-log-sanitize"

describe("audit-log-sanitize", () => {
  it("normalizes whitespace and line breaks", () => {
    expect(sanitizeAuditDetail("  a\n\tb\r\n c  ")).toBe("a b c")
  })

  it("removes control and escape characters", () => {
    const raw = "reason=\u001b[31mBAD\u0000\u0008input"
    expect(sanitizeAuditDetail(raw)).toBe("reason= [31mBAD input")
  })

  it("truncates overly long details", () => {
    const source = "x".repeat(300)
    const result = sanitizeAuditDetail(source)
    expect(result).not.toBeNull()
    expect(result?.length).toBe(220)
    expect(result?.endsWith("...")).toBe(true)
  })

  it("builds auth audit title with safe identity and details", () => {
    expect(buildAuthAuditTitle(" user@example.com ", " reason=bad\ninput ")).toBe(
      "user@example.com | reason=bad input",
    )
  })

  it("sanitizes path segment and limits length", () => {
    const longIdentity = "user with spaces and/slashes?" + "x".repeat(120)
    const result = sanitizeAuditPathSegment(longIdentity)
    expect(result).toContain("user_with_spaces_and_slashes_")
    expect(result.length).toBe(80)
  })
})
