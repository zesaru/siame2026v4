import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const persistCspReportMock = vi.fn()

vi.mock("@/lib/services/csp-report.service", () => ({
  persistCspReport: persistCspReportMock,
}))

describe("POST /api/security/csp-report", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    warnSpy.mockRestore()
  })

  it("persists summarized report", async () => {
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/security/csp-report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.1.2.3",
      },
      body: JSON.stringify({
        "csp-report": {
          "blocked-uri": "https://evil.example/script.js",
          "violated-directive": "script-src",
          disposition: "report",
        },
      }),
    }) as unknown as NextRequest

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(persistCspReportMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it("rejects oversized payload", async () => {
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/security/csp-report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(70 * 1024),
        "x-forwarded-for": "10.1.2.4",
      },
      body: JSON.stringify({ hello: "world" }),
    }) as unknown as NextRequest

    const res = await POST(req)

    expect(res.status).toBe(413)
    expect(persistCspReportMock).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({ ok: false, error: "payload_too_large" })
  })

  it("rate limits excessive reports from same IP", async () => {
    const { POST } = await import("./route")

    let lastStatus = 200
    let lastRetryAfter: string | null = null

    for (let i = 0; i < 125; i += 1) {
      const req = new Request("http://localhost/api/security/csp-report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.1.2.5",
        },
        body: JSON.stringify({
          "csp-report": {
            "blocked-uri": "https://example.test/x.js",
          },
        }),
      }) as unknown as NextRequest

      const res = await POST(req)
      lastStatus = res.status
      lastRetryAfter = res.headers.get("Retry-After")
      if (res.status === 429) break
    }

    expect(lastStatus).toBe(429)
    expect(Number(lastRetryAfter || "0")).toBeGreaterThan(0)
  })
})
