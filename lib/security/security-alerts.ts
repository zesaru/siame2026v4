import { prisma } from "@/lib/db"

export type SecurityAlertSeverity = "high" | "medium"
export type SecurityAlertCode =
  | "LOGIN_FAILED_SPIKE"
  | "SESSION_POLICY_SPIKE"
  | "LOGIN_BLOCKED_IP_SPIKE"
  | "PASSWORD_CHANGE_FAILED_SPIKE"
  | "PASSWORD_CHANGE_BLOCKED_SPIKE"
  | "SIGNUP_BLOCKED_SPIKE"

export interface SecurityAlert {
  code: SecurityAlertCode
  severity: SecurityAlertSeverity
  title: string
  message: string
  windowMinutes: number
  currentCount: number
  threshold: number
  topIp: string | null
}

export interface SecurityAlertConfig {
  windowMinutes: number
  loginFailedThreshold: number
  sessionPolicyThreshold: number
  ipQuarantineBlockedThreshold: number
  passwordChangeFailedThreshold: number
  passwordChangeBlockedThreshold: number
  signupBlockedThreshold: number
}

interface CountRow {
  count: number
}

interface TopIpRow {
  ipAddress: string | null
  count: number
}

function makeInterval(windowMinutes: number): string {
  const safe = Math.max(1, Math.trunc(windowMinutes))
  return `${safe} minutes`
}

export async function evaluateSecurityAlerts(config: SecurityAlertConfig): Promise<SecurityAlert[]> {
  const interval = makeInterval(config.windowMinutes)

  const [
    loginRows,
    policyRows,
    blockedIpRows,
    passwordFailedRows,
    passwordBlockedRows,
    signupBlockedRows,
    loginTopIpRows,
    policyTopIpRows,
    blockedTopIpRows,
    passwordFailedTopIpRows,
    passwordBlockedTopIpRows,
    signupBlockedTopIpRows,
  ] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= NOW() - ${interval}::interval
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'SESSION_REVOKED_POLICY'
        AND timestamp >= NOW() - ${interval}::interval
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'LOGIN_BLOCKED'
        AND timestamp >= NOW() - ${interval}::interval
        AND COALESCE("documentTitle", '') LIKE '%ip_quarantine%'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'PASSWORD_CHANGE_FAILED'
        AND timestamp >= NOW() - ${interval}::interval
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'PASSWORD_CHANGE_BLOCKED'
        AND timestamp >= NOW() - ${interval}::interval
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'SIGNUP_BLOCKED'
        AND timestamp >= NOW() - ${interval}::interval
    `,
    prisma.$queryRaw<TopIpRow[]>`
      SELECT "ipAddress", COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= NOW() - ${interval}::interval
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<TopIpRow[]>`
      SELECT "ipAddress", COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'SESSION_REVOKED_POLICY'
        AND timestamp >= NOW() - ${interval}::interval
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<TopIpRow[]>`
      SELECT "ipAddress", COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'LOGIN_BLOCKED'
        AND timestamp >= NOW() - ${interval}::interval
        AND COALESCE("documentTitle", '') LIKE '%ip_quarantine%'
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<TopIpRow[]>`
      SELECT "ipAddress", COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'PASSWORD_CHANGE_FAILED'
        AND timestamp >= NOW() - ${interval}::interval
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<TopIpRow[]>`
      SELECT "ipAddress", COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'PASSWORD_CHANGE_BLOCKED'
        AND timestamp >= NOW() - ${interval}::interval
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<TopIpRow[]>`
      SELECT "ipAddress", COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'SIGNUP_BLOCKED'
        AND timestamp >= NOW() - ${interval}::interval
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT 1
    `,
  ])

  const loginCount = Number(loginRows[0]?.count || 0)
  const policyCount = Number(policyRows[0]?.count || 0)
  const blockedIpCount = Number(blockedIpRows[0]?.count || 0)
  const passwordChangeFailedCount = Number(passwordFailedRows[0]?.count || 0)
  const passwordChangeBlockedCount = Number(passwordBlockedRows[0]?.count || 0)
  const signupBlockedCount = Number(signupBlockedRows[0]?.count || 0)
  const alerts: SecurityAlert[] = []

  if (loginCount >= config.loginFailedThreshold) {
    alerts.push({
      code: "LOGIN_FAILED_SPIKE",
      severity: loginCount >= config.loginFailedThreshold * 2 ? "high" : "medium",
      title: "Pico de intentos fallidos de login",
      message: `Se detectaron ${loginCount} logins fallidos en ${config.windowMinutes} min (umbral ${config.loginFailedThreshold}).`,
      windowMinutes: config.windowMinutes,
      currentCount: loginCount,
      threshold: config.loginFailedThreshold,
      topIp: loginTopIpRows[0]?.ipAddress || null,
    })
  }

  if (policyCount >= config.sessionPolicyThreshold) {
    alerts.push({
      code: "SESSION_POLICY_SPIKE",
      severity: policyCount >= config.sessionPolicyThreshold * 2 ? "high" : "medium",
      title: "Pico de revocaciones por política",
      message: `Se detectaron ${policyCount} revocaciones de sesión por política en ${config.windowMinutes} min (umbral ${config.sessionPolicyThreshold}).`,
      windowMinutes: config.windowMinutes,
      currentCount: policyCount,
      threshold: config.sessionPolicyThreshold,
      topIp: policyTopIpRows[0]?.ipAddress || null,
    })
  }

  if (blockedIpCount >= config.ipQuarantineBlockedThreshold) {
    alerts.push({
      code: "LOGIN_BLOCKED_IP_SPIKE",
      severity: blockedIpCount >= config.ipQuarantineBlockedThreshold * 2 ? "high" : "medium",
      title: "Pico de bloqueos por IP en cuarentena",
      message: `Se detectaron ${blockedIpCount} bloqueos por IP en cuarentena en ${config.windowMinutes} min (umbral ${config.ipQuarantineBlockedThreshold}).`,
      windowMinutes: config.windowMinutes,
      currentCount: blockedIpCount,
      threshold: config.ipQuarantineBlockedThreshold,
      topIp: blockedTopIpRows[0]?.ipAddress || null,
    })
  }

  if (passwordChangeFailedCount >= config.passwordChangeFailedThreshold) {
    alerts.push({
      code: "PASSWORD_CHANGE_FAILED_SPIKE",
      severity: passwordChangeFailedCount >= config.passwordChangeFailedThreshold * 2 ? "high" : "medium",
      title: "Pico de fallos en cambio de contraseña",
      message: `Se detectaron ${passwordChangeFailedCount} fallos de cambio de contraseña en ${config.windowMinutes} min (umbral ${config.passwordChangeFailedThreshold}).`,
      windowMinutes: config.windowMinutes,
      currentCount: passwordChangeFailedCount,
      threshold: config.passwordChangeFailedThreshold,
      topIp: passwordFailedTopIpRows[0]?.ipAddress || null,
    })
  }

  if (passwordChangeBlockedCount >= config.passwordChangeBlockedThreshold) {
    alerts.push({
      code: "PASSWORD_CHANGE_BLOCKED_SPIKE",
      severity: passwordChangeBlockedCount >= config.passwordChangeBlockedThreshold * 2 ? "high" : "medium",
      title: "Pico de bloqueos en cambio de contraseña",
      message: `Se detectaron ${passwordChangeBlockedCount} bloqueos de cambio de contraseña en ${config.windowMinutes} min (umbral ${config.passwordChangeBlockedThreshold}).`,
      windowMinutes: config.windowMinutes,
      currentCount: passwordChangeBlockedCount,
      threshold: config.passwordChangeBlockedThreshold,
      topIp: passwordBlockedTopIpRows[0]?.ipAddress || null,
    })
  }

  if (signupBlockedCount >= config.signupBlockedThreshold) {
    alerts.push({
      code: "SIGNUP_BLOCKED_SPIKE",
      severity: signupBlockedCount >= config.signupBlockedThreshold * 2 ? "high" : "medium",
      title: "Pico de bloqueos de registro",
      message: `Se detectaron ${signupBlockedCount} bloqueos de registro en ${config.windowMinutes} min (umbral ${config.signupBlockedThreshold}).`,
      windowMinutes: config.windowMinutes,
      currentCount: signupBlockedCount,
      threshold: config.signupBlockedThreshold,
      topIp: signupBlockedTopIpRows[0]?.ipAddress || null,
    })
  }

  return alerts
}
