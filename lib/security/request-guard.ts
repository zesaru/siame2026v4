import type { NextRequest } from "next/server"

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null
  return value.trim().toLowerCase().replace(/\.$/, "")
}

function extractHostFromUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).host.trim().toLowerCase()
  } catch {
    return null
  }
}

export function isTrustedMutationOrigin(input: {
  requestHost: string | null
  originHeader?: string | null
  refererHeader?: string | null
}): boolean {
  const requestHost = normalizeHost(input.requestHost)
  if (!requestHost) return false

  const originHost = extractHostFromUrl(input.originHeader)
  if (originHost && originHost === requestHost) return true

  const refererHost = extractHostFromUrl(input.refererHeader)
  if (refererHost && refererHost === requestHost) return true

  return false
}

export function getTrustedMutationHostsFromEnv(): string[] {
  const raw = (process.env.SECURITY_TRUSTED_HOSTS || "").trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((h) => normalizeHost(h))
    .filter((h): h is string => Boolean(h))
}

export function assertTrustedMutationHost(requestHost: string | null): void {
  const host = normalizeHost(requestHost)
  if (!host) {
    throw new Error("Invalid request host")
  }

  const trustedHosts = getTrustedMutationHostsFromEnv()
  if (trustedHosts.length === 0) return
  if (!trustedHosts.includes(host)) {
    throw new Error("Untrusted request host")
  }
}

export function assertTrustedMutationRequest(req: NextRequest): void {
  const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host")
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")

  assertTrustedMutationHost(requestHost)

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.SECURITY_ALLOW_MISSING_ORIGIN === "true" &&
    !origin &&
    !referer
  ) {
    return
  }

  const trusted = isTrustedMutationOrigin({
    requestHost,
    originHeader: origin,
    refererHeader: referer,
  })

  if (!trusted) {
    throw new Error("Invalid request origin")
  }
}
