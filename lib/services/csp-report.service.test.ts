import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let originalCwd = ""
let tempDir = ""

async function loadService() {
  vi.resetModules()
  return import("./csp-report.service")
}

describe("csp-report.service", () => {
  beforeEach(async () => {
    originalCwd = process.cwd()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "siame-csp-"))
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })

  it("classifies directives by severity", async () => {
    const { getCspSeverity } = await loadService()

    expect(getCspSeverity("script-src")).toBe("high")
    expect(getCspSeverity("connect-src")).toBe("medium")
    expect(getCspSeverity("img-src")).toBe("low")
  })

  it("persists and reads reports with severity filters", async () => {
    const { persistCspReport, readRecentCspReports } = await loadService()

    await persistCspReport({
      timestamp: "2026-03-01T10:00:00.000Z",
      blockedUri: "https://a.example",
      violatedDirective: "img-src",
      effectiveDirective: "img-src",
      sourceFile: null,
      disposition: "report",
      documentUri: "http://localhost:3001",
      referrer: null,
      userAgent: "test-agent",
      ipAddress: "127.0.0.1",
    })

    await persistCspReport({
      timestamp: "2026-03-01T11:00:00.000Z",
      blockedUri: "https://b.example",
      violatedDirective: "connect-src",
      effectiveDirective: "connect-src",
      sourceFile: null,
      disposition: "report",
      documentUri: "http://localhost:3001",
      referrer: null,
      userAgent: "test-agent",
      ipAddress: "127.0.0.1",
    })

    await persistCspReport({
      timestamp: "2026-03-01T12:00:00.000Z",
      blockedUri: "https://c.example",
      violatedDirective: "script-src",
      effectiveDirective: "script-src",
      sourceFile: null,
      disposition: "report",
      documentUri: "http://localhost:3001",
      referrer: null,
      userAgent: "test-agent",
      ipAddress: "127.0.0.1",
    })

    const all = await readRecentCspReports({ sortBy: "severity", limit: 10 })
    expect(all.total).toBe(3)
    expect(all.reports.map((r) => r.severity)).toEqual(["high", "medium", "low"])

    const high = await readRecentCspReports({ severity: "high", limit: 10 })
    expect(high.total).toBe(1)
    expect(high.reports[0]?.effectiveDirective).toBe("script-src")

    const filteredDirective = await readRecentCspReports({ directive: "connect-src", limit: 10 })
    expect(filteredDirective.total).toBe(1)
    expect(filteredDirective.reports[0]?.severity).toBe("medium")
  })
})
