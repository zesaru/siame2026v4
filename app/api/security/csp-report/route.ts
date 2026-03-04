import { NextRequest, NextResponse } from "next/server"
import { persistCspReport } from "@/lib/services/csp-report.service"

export const dynamic = "force-dynamic"

const CSP_REPORT_MAX_CONTENT_LENGTH = 64 * 1024
const CSP_REPORT_WINDOW_MS = 60 * 1000
const CSP_REPORT_MAX_PER_IP = 120
const CSP_REPORT_MAX_BUCKETS = 5000
const cspBuckets = new Map<string, number[]>()

function extractIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function cspRateLimitDecision(ipAddress: string): { limited: boolean; retryAfterSec?: number } {
  const now = Date.now()
  // Opportunistic cleanup to prevent unbounded memory growth under spoofed IP floods.
  if (!cspBuckets.has(ipAddress) && cspBuckets.size >= CSP_REPORT_MAX_BUCKETS) {
    for (const [bucketIp, bucketAttempts] of cspBuckets.entries()) {
      const latestAttempt = bucketAttempts[bucketAttempts.length - 1]
      if (!latestAttempt || now - latestAttempt > CSP_REPORT_WINDOW_MS) {
        cspBuckets.delete(bucketIp)
      }
    }
  }

  if (!cspBuckets.has(ipAddress) && cspBuckets.size >= CSP_REPORT_MAX_BUCKETS) {
    return { limited: true, retryAfterSec: 1 }
  }

  const attempts = (cspBuckets.get(ipAddress) || []).filter((t) => now - t <= CSP_REPORT_WINDOW_MS)
  if (attempts.length === 0) {
    cspBuckets.delete(ipAddress)
  }

  if (attempts.length >= CSP_REPORT_MAX_PER_IP) {
    const oldest = attempts[0]
    return {
      limited: true,
      retryAfterSec: Math.max(1, Math.ceil((oldest + CSP_REPORT_WINDOW_MS - now) / 1000)),
    }
  }

  attempts.push(now)
  cspBuckets.set(ipAddress, attempts)
  return { limited: false }
}

export async function POST(req: NextRequest) {
  try {
    const ipAddress = extractIp(req)
    const decision = cspRateLimitDecision(ipAddress)
    if (decision.limited) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(decision.retryAfterSec || 60),
          },
        },
      )
    }

    const contentLength = Number(req.headers.get("content-length") || "0")
    if (Number.isFinite(contentLength) && contentLength > CSP_REPORT_MAX_CONTENT_LENGTH) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 })
    }

    const rawBody = await req.text().catch(() => "")
    const rawSize = new TextEncoder().encode(rawBody).length
    if (rawSize > CSP_REPORT_MAX_CONTENT_LENGTH) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 })
    }

    const body =
      rawBody.length === 0 ? null : (() => {
        try {
          return JSON.parse(rawBody)
        } catch {
          return null
        }
      })()
    const report = body?.["csp-report"] || body || {}

    // Keep logs small and avoid accidental sensitive data leakage.
    const summary = {
      blockedUri: report?.["blocked-uri"] || report?.blockedURI || null,
      violatedDirective: report?.["violated-directive"] || report?.violatedDirective || null,
      effectiveDirective: report?.["effective-directive"] || report?.effectiveDirective || null,
      sourceFile: report?.["source-file"] || report?.sourceFile || null,
      disposition: report?.disposition || null,
      documentUri: report?.["document-uri"] || report?.documentURI || null,
      referrer: report?.referrer || null,
      userAgent: req.headers.get("user-agent"),
      ipAddress,
      timestamp: new Date().toISOString(),
    }

    await persistCspReport(summary)
    if (process.env.NODE_ENV !== "test") {
      console.warn("[CSP][Report-Only]", summary)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[CSP][Report-Only] Failed to parse report:", error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
