import { prisma } from "@/lib/db"
import { hasActiveIpAllowOverride } from "@/lib/security/ip-quarantine"

const WINDOW_MINUTES = 15
const MAX_FAILED_PER_USER_IP = 6
const MAX_FAILED_PER_IP = 30
function getIpQuarantineWindowMinutes(): number {
  const raw = Number(process.env.AUTH_IP_QUARANTINE_WINDOW_MINUTES || "60")
  if (!Number.isFinite(raw)) return 60
  return Math.max(5, Math.trunc(raw))
}

function getMaxFailedPerIpQuarantine(): number {
  const raw = Number(process.env.AUTH_IP_QUARANTINE_THRESHOLD || "80")
  if (!Number.isFinite(raw)) return 80
  return Math.max(10, Math.trunc(raw))
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase()
}

function normalizeIp(ip: string | string[] | null | undefined): string | null {
  if (!ip) return null
  const raw = Array.isArray(ip) ? ip[0] : ip
  const first = raw.split(",")[0]?.trim()
  return first || null
}

export async function authPersistentGuardCheck(params: {
  email: string | null | undefined
  ip: string | string[] | null | undefined
}): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number; reason: "user_ip" | "ip" | "ip_quarantine" }> {
  const email = normalizeEmail(params.email)
  const ip = normalizeIp(params.ip)
  if (!ip) return { allowed: true }

  const quarantineWindowMinutes = getIpQuarantineWindowMinutes()
  const maxFailedPerIpQuarantine = getMaxFailedPerIpQuarantine()
  const hasAllowOverride = await hasActiveIpAllowOverride(ip)

  if (!hasAllowOverride) {
    const quarantineFromDate = new Date(Date.now() - quarantineWindowMinutes * 60 * 1000)
    const failedByIpAggressive = await prisma.fileAuditLog.count({
      where: {
        documentType: "AUTH",
        action: "LOGIN_FAILED",
        ipAddress: ip,
        timestamp: { gte: quarantineFromDate },
      },
    })

    if (failedByIpAggressive >= maxFailedPerIpQuarantine) {
      return {
        allowed: false,
        retryAfterSec: quarantineWindowMinutes * 60,
        reason: "ip_quarantine",
      }
    }
  }

  if (!email) return { allowed: true }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    // Avoid leaking user existence via persistence path.
    return { allowed: true }
  }

  const fromDate = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  const [failedByUserIp, failedByIp] = await Promise.all([
    prisma.fileAuditLog.count({
      where: {
        documentType: "AUTH",
        action: "LOGIN_FAILED",
        userId: user.id,
        ipAddress: ip,
        timestamp: { gte: fromDate },
      },
    }),
    prisma.fileAuditLog.count({
      where: {
        documentType: "AUTH",
        action: "LOGIN_FAILED",
        ipAddress: ip,
        timestamp: { gte: fromDate },
      },
    }),
  ])

  const retryAfterSec = WINDOW_MINUTES * 60

  if (failedByUserIp >= MAX_FAILED_PER_USER_IP) {
    return { allowed: false, retryAfterSec, reason: "user_ip" }
  }

  if (failedByIp >= MAX_FAILED_PER_IP) {
    return { allowed: false, retryAfterSec, reason: "ip" }
  }

  return { allowed: true }
}
