import { afterEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { __resetProxyRateLimitState, proxy } from "./proxy"

describe("security proxy", () => {
  const oldEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...oldEnv }
    __resetProxyRateLimitState()
  })

  it("applies security headers on regular request", () => {
    const req = new NextRequest("http://localhost:3001/dashboard", {
      headers: {
        "x-forwarded-proto": "https",
      },
    })

    const res = proxy(req)

    expect(res.headers.get("X-Frame-Options")).toBe("DENY")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(res.headers.get("X-DNS-Prefetch-Control")).toBe("off")
    expect(res.headers.get("X-Permitted-Cross-Domain-Policies")).toBe("none")
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin")
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000")
  })

  it("rate limits sensitive auth path", () => {
    const headers = {
      "x-forwarded-for": "203.0.113.44",
      "x-forwarded-proto": "https",
      host: "localhost:3001",
    }

    let limited = false
    let status = 200
    let retryAfter = ""

    for (let i = 0; i < 45; i += 1) {
      const req = new NextRequest("http://localhost:3001/api/auth/signup", { headers })
      const res = proxy(req)
      if (res.status === 429) {
        limited = true
        status = res.status
        retryAfter = res.headers.get("Retry-After") || ""
        break
      }
    }

    expect(limited).toBe(true)
    expect(status).toBe(429)
    expect(Number(retryAfter)).toBeGreaterThan(0)
  })

  it("limits new auth buckets when max bucket capacity is reached", () => {
    process.env.AUTH_RATE_LIMIT_MAX_BUCKETS = "2"

    const headersA = {
      "x-forwarded-for": "203.0.113.101",
      host: "localhost:3001",
    }
    const headersB = {
      "x-forwarded-for": "203.0.113.102",
      host: "localhost:3001",
    }
    const headersC = {
      "x-forwarded-for": "203.0.113.103",
      host: "localhost:3001",
    }

    const reqA = new NextRequest("http://localhost:3001/api/auth/signup", { headers: headersA })
    const reqB = new NextRequest("http://localhost:3001/api/auth/signup", { headers: headersB })
    const reqC = new NextRequest("http://localhost:3001/api/auth/signup", { headers: headersC })

    const resA = proxy(reqA)
    const resB = proxy(reqB)
    const resC = proxy(reqC)

    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    expect(resC.status).toBe(429)
    expect(Number(resC.headers.get("Retry-After") || "0")).toBeGreaterThan(0)
  })
})
