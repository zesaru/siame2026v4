import fs from "node:fs/promises"
import path from "node:path"

const SECURITY_DIR = path.join(process.cwd(), "storage", "security")
const CSP_REPORTS_FILE = path.join(SECURITY_DIR, "csp-reports.ndjson")
const CSP_REPORTS_MAX_BYTES = 5 * 1024 * 1024 // 5MB

export interface PersistedCspReport {
  timestamp: string
  blockedUri: string | null
  violatedDirective: string | null
  effectiveDirective: string | null
  sourceFile: string | null
  disposition: string | null
  documentUri: string | null
  referrer: string | null
  userAgent: string | null
  ipAddress: string | null
}

export type CspSeverity = "high" | "medium" | "low"

export interface EnrichedCspReport extends PersistedCspReport {
  severity: CspSeverity
}

export interface ReadCspReportsOptions {
  limit?: number
  offset?: number
  directive?: string
  severity?: CspSeverity
  startDate?: Date
  endDate?: Date
  sortBy?: "timestamp" | "severity"
}

export function getCspSeverity(directive: string | null | undefined): CspSeverity {
  const value = (directive || "").toLowerCase()

  if (
    value.includes("script-src") ||
    value.includes("object-src") ||
    value.includes("frame-ancestors") ||
    value.includes("base-uri") ||
    value.includes("form-action")
  ) {
    return "high"
  }

  if (
    value.includes("connect-src") ||
    value.includes("worker-src") ||
    value.includes("frame-src") ||
    value.includes("style-src")
  ) {
    return "medium"
  }

  return "low"
}

async function ensureSecurityDir() {
  await fs.mkdir(SECURITY_DIR, { recursive: true })
}

async function rotateIfTooLarge() {
  try {
    const stat = await fs.stat(CSP_REPORTS_FILE)
    if (stat.size <= CSP_REPORTS_MAX_BYTES) return

    const rotatedFile = `${CSP_REPORTS_FILE}.${Date.now()}.bak`
    await fs.rename(CSP_REPORTS_FILE, rotatedFile)
  } catch {
    // no-op if file does not exist
  }
}

export async function persistCspReport(report: PersistedCspReport) {
  await ensureSecurityDir()
  await rotateIfTooLarge()
  await fs.appendFile(CSP_REPORTS_FILE, `${JSON.stringify(report)}\n`, "utf8")
}

export async function readRecentCspReports(
  options: ReadCspReportsOptions = {},
): Promise<{ reports: EnrichedCspReport[]; total: number }> {
  try {
    const limit = Math.max(1, Math.min(options.limit || 200, 1000))
    const offset = Math.max(0, options.offset || 0)
    const directive = (options.directive || "").trim().toLowerCase()
    const severityFilter = options.severity

    const raw = await fs.readFile(CSP_REPORTS_FILE, "utf8")
    const lines = raw.split(/\r?\n/).filter(Boolean)
    const items: PersistedCspReport[] = []

    for (const line of lines) {
      try {
        items.push(JSON.parse(line))
      } catch {
        // ignore invalid line
      }
    }

    const newestFirst = items.reverse()
    const filtered = newestFirst.filter((report) => {
      const reportDirective = (report.effectiveDirective || report.violatedDirective || "").toLowerCase()
      const reportDate = new Date(report.timestamp)
      const severity = getCspSeverity(report.effectiveDirective || report.violatedDirective)

      if (directive && !reportDirective.includes(directive)) return false
      if (severityFilter && severity !== severityFilter) return false
      if (options.startDate && reportDate < options.startDate) return false
      if (options.endDate && reportDate > options.endDate) return false
      return true
    })

    const enriched: EnrichedCspReport[] = filtered.map((report) => ({
      ...report,
      severity: getCspSeverity(report.effectiveDirective || report.violatedDirective),
    }))

    const sorted = [...enriched].sort((a, b) => {
      if (options.sortBy === "severity") {
        const rank: Record<CspSeverity, number> = { high: 3, medium: 2, low: 1 }
        if (rank[b.severity] !== rank[a.severity]) {
          return rank[b.severity] - rank[a.severity]
        }
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    const paginated = sorted.slice(offset, offset + limit)
    return { reports: paginated, total: filtered.length }
  } catch {
    return { reports: [], total: 0 }
  }
}
