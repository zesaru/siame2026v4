import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  authRateLimitCheck,
  authRateLimitRegisterFailure,
  authRateLimitRegisterSuccess,
} from "./auth-rate-limit"

describe("auth-rate-limit", () => {
  const email = "user@example.com"
  const ip = "127.0.0.1"

  beforeEach(() => {
    vi.useRealTimers()
  })

  it("allows initial attempts", () => {
    const result = authRateLimitCheck({ email, ip })
    expect(result.allowed).toBe(true)
  })

  it("blocks user+ip after repeated failures", () => {
    for (let i = 0; i < 6; i++) {
      authRateLimitRegisterFailure({ email, ip })
    }

    const result = authRateLimitCheck({ email, ip })
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toBe("user_ip_lock")
      expect(result.retryAfterSec).toBeGreaterThan(0)
    }
  })

  it("clears user+ip lock state on success", () => {
    for (let i = 0; i < 6; i++) {
      authRateLimitRegisterFailure({ email, ip })
    }

    authRateLimitRegisterSuccess({ email, ip })

    const result = authRateLimitCheck({ email, ip })
    expect(result.allowed).toBe(true)
  })
})
