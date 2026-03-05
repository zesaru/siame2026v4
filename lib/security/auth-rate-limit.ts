type AuthRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; reason: "ip_window" | "user_ip_lock" }

interface AttemptBucket {
  attempts: number[]
  blockedUntil: number
}

const buckets = new Map<string, AttemptBucket>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS_PER_IP = 30
const MAX_ATTEMPTS_PER_USER_IP = 6
const USER_IP_BLOCK_MS = 15 * 60 * 1000
const CLEANUP_MAX_AGE_MS = 24 * 60 * 60 * 1000

function nowMs() {
  return Date.now()
}

function getBucket(key: string): AttemptBucket {
  const existing = buckets.get(key)
  if (existing) return existing
  const created: AttemptBucket = { attempts: [], blockedUntil: 0 }
  buckets.set(key, created)
  return created
}

function pruneWindow(bucket: AttemptBucket, now: number) {
  const min = now - WINDOW_MS
  bucket.attempts = bucket.attempts.filter((t) => t >= min)
}

function cleanupOldBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    const lastAttempt = bucket.attempts[bucket.attempts.length - 1] || 0
    const stale = now - Math.max(lastAttempt, bucket.blockedUntil) > CLEANUP_MAX_AGE_MS
    if (stale) buckets.delete(key)
  }
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase()
}

function normalizeIp(ip: string | string[] | null | undefined): string {
  if (!ip) return "unknown"
  const raw = Array.isArray(ip) ? ip[0] : ip
  const first = raw.split(",")[0]?.trim()
  return first || "unknown"
}

export function authRateLimitCheck(params: {
  ip: string | string[] | null | undefined
  email: string | null | undefined
}): AuthRateLimitDecision {
  const now = nowMs()
  cleanupOldBuckets(now)

  const ip = normalizeIp(params.ip)
  const email = normalizeEmail(params.email)

  const ipKey = `ip:${ip}`
  const ipBucket = getBucket(ipKey)
  pruneWindow(ipBucket, now)
  if (ipBucket.attempts.length >= MAX_ATTEMPTS_PER_IP) {
    const oldestInWindow = ipBucket.attempts[0]
    const retryAfterSec = Math.max(1, Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000))
    return { allowed: false, retryAfterSec, reason: "ip_window" }
  }

  if (email) {
    const userIpKey = `userip:${email}:${ip}`
    const userIpBucket = getBucket(userIpKey)
    if (userIpBucket.blockedUntil > now) {
      const retryAfterSec = Math.max(1, Math.ceil((userIpBucket.blockedUntil - now) / 1000))
      return { allowed: false, retryAfterSec, reason: "user_ip_lock" }
    }
  }

  return { allowed: true }
}

export function authRateLimitRegisterFailure(params: {
  ip: string | string[] | null | undefined
  email: string | null | undefined
}) {
  const now = nowMs()
  const ip = normalizeIp(params.ip)
  const email = normalizeEmail(params.email)

  const ipBucket = getBucket(`ip:${ip}`)
  pruneWindow(ipBucket, now)
  ipBucket.attempts.push(now)

  if (email) {
    const userIpBucket = getBucket(`userip:${email}:${ip}`)
    pruneWindow(userIpBucket, now)
    userIpBucket.attempts.push(now)
    if (userIpBucket.attempts.length >= MAX_ATTEMPTS_PER_USER_IP) {
      userIpBucket.blockedUntil = now + USER_IP_BLOCK_MS
      userIpBucket.attempts = []
    }
  }
}

export function authRateLimitRegisterSuccess(params: {
  ip: string | string[] | null | undefined
  email: string | null | undefined
}) {
  const ip = normalizeIp(params.ip)
  const email = normalizeEmail(params.email)
  if (email) {
    buckets.delete(`userip:${email}:${ip}`)
  }
}
