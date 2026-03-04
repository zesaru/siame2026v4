import { NextRequest, NextResponse } from "next/server"

type Bucket = {
  attempts: number[]
}

const RATE_WINDOW_MS = 15 * 60 * 1000
const MAX_AUTH_REQUESTS_PER_IP = 40
const buckets = new Map<string, Bucket>()

function buildCspReportOnly() {
  const azureEndpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT
  let azureOrigin = ""

  if (azureEndpoint) {
    try {
      azureOrigin = new URL(azureEndpoint).origin
    } catch {
      azureOrigin = ""
    }
  }

  const connectSrc = ["'self'", "https:", "ws:", "wss:"]
  if (azureOrigin) connectSrc.push(azureOrigin)

  const allowUnsafeEval =
    process.env.NODE_ENV !== "production" || process.env.SECURITY_CSP_ALLOW_UNSAFE_EVAL === "true"
  const scriptSrc = allowUnsafeEval
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
    : "script-src 'self' 'unsafe-inline' https:"

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    scriptSrc,
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "report-uri /api/security/csp-report",
  ].join("; ")
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

function shouldRateLimit(req: NextRequest): { limited: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const ip = getClientIp(req)
  const key = `auth:${ip}`
  const bucket = buckets.get(key) || { attempts: [] }
  bucket.attempts = bucket.attempts.filter((t) => now - t <= RATE_WINDOW_MS)

  if (bucket.attempts.length >= MAX_AUTH_REQUESTS_PER_IP) {
    const oldest = bucket.attempts[0]
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000))
    buckets.set(key, bucket)
    return { limited: true, retryAfterSec }
  }

  bucket.attempts.push(now)
  buckets.set(key, bucket)
  return { limited: false }
}

function applySecurityHeaders(response: NextResponse, req: NextRequest) {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-DNS-Prefetch-Control", "off")
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  const cspValue = buildCspReportOnly()
  const cspMode = (process.env.SECURITY_CSP_MODE || "report-only").toLowerCase()
  if (cspMode === "enforce") {
    response.headers.set("Content-Security-Policy", cspValue)
  } else {
    response.headers.set("Content-Security-Policy-Report-Only", cspValue)
  }

  const proto = req.headers.get("x-forwarded-proto")
  if (proto === "https") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }
}

export function proxy(req: NextRequest) {
  const isAuthSensitivePath =
    req.nextUrl.pathname === "/api/auth/signup" ||
    req.nextUrl.pathname === "/api/auth/callback/credentials"

  if (isAuthSensitivePath) {
    const { limited, retryAfterSec } = shouldRateLimit(req)
    if (limited) {
      const response = NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta nuevamente en unos minutos." },
        { status: 429 },
      )
      response.headers.set("Retry-After", String(retryAfterSec || 60))
      applySecurityHeaders(response, req)
      return response
    }
  }

  const response = NextResponse.next()
  applySecurityHeaders(response, req)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
