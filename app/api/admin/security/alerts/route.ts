import { NextResponse } from "next/server"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { evaluateSecurityAlerts } from "@/lib/security/security-alerts"

export const dynamic = "force-dynamic"

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] || String(fallback))
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.trunc(raw))
}

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"])

    const windowMinutes = envInt("SECURITY_ALERT_WINDOW_MINUTES", 15)
    const loginFailedThreshold = envInt("SECURITY_ALERT_LOGIN_FAILED_THRESHOLD", 20)
    const sessionPolicyThreshold = envInt("SECURITY_ALERT_SESSION_POLICY_THRESHOLD", 10)
    const ipQuarantineBlockedThreshold = envInt("SECURITY_ALERT_IP_QUARANTINE_THRESHOLD", 8)
    const passwordChangeFailedThreshold = envInt("SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD", 8)
    const passwordChangeBlockedThreshold = envInt("SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD", 6)
    const signupBlockedThreshold = envInt("SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD", 8)

    const alerts = await evaluateSecurityAlerts({
      windowMinutes,
      loginFailedThreshold,
      sessionPolicyThreshold,
      ipQuarantineBlockedThreshold,
      passwordChangeFailedThreshold,
      passwordChangeBlockedThreshold,
      signupBlockedThreshold,
    })

    return NextResponse.json({
      alerts,
      config: {
        windowMinutes,
        loginFailedThreshold,
        sessionPolicyThreshold,
        ipQuarantineBlockedThreshold,
        passwordChangeFailedThreshold,
        passwordChangeBlockedThreshold,
        signupBlockedThreshold,
      },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error fetching security alerts" }, { status: 500 })
  }
}
