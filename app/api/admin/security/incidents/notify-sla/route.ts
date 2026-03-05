import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { sendSlaBreachNotificationNow } from "@/lib/security/security-notifications"
import { extractIpAddress, extractUserAgent, logFileOperation } from "@/lib/services/file-audit.service"

export async function POST(req: NextRequest) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await requireRole(["SUPER_ADMIN"])

    const body = await req.json().catch(() => ({}))
    const force = body?.force === true
    const result = await sendSlaBreachNotificationNow({ source: "manual", force })

    await logFileOperation({
      userId: session.user.id,
      filePath: "SECURITY_INCIDENT/NOTIFY_SLA",
      action: "UPDATE",
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error notifying SLA breaches" }, { status: 500 })
  }
}
