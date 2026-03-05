const MAX_AUDIT_DETAILS_LENGTH = 220
const MAX_AUDIT_PATH_SEGMENT_LENGTH = 80

export function sanitizeAuditDetail(input: string | null | undefined): string | null {
  if (!input) return null

  const trimmed = String(input)
    // Strip control chars (including ANSI escape prefix) to avoid log injection/render artifacts.
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!trimmed) return null
  if (trimmed.length <= MAX_AUDIT_DETAILS_LENGTH) return trimmed

  return `${trimmed.slice(0, MAX_AUDIT_DETAILS_LENGTH - 3)}...`
}

export function buildAuthAuditTitle(identity: string, details?: string | null): string {
  const safeIdentity = sanitizeAuditDetail(identity) || "auth-event"
  const safeDetails = sanitizeAuditDetail(details)
  if (!safeDetails) return safeIdentity
  return `${safeIdentity} | ${safeDetails}`
}

export function sanitizeAuditPathSegment(input: string | null | undefined): string {
  const normalized = sanitizeAuditDetail(input || "") || "unknown"
  const compact = normalized.replace(/[^\w@.+-]/g, "_")
  if (compact.length <= MAX_AUDIT_PATH_SEGMENT_LENGTH) return compact
  return compact.slice(0, MAX_AUDIT_PATH_SEGMENT_LENGTH)
}
