import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { revokeUserSessionsByUserId } from "@/lib/security/session-revocation"
import { extractIpAddress, extractUserAgent, logAuthSecurityEvent } from "@/lib/services/file-audit.service"

export async function POST(req: NextRequest) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const newVersion = await revokeUserSessionsByUserId(session.user.id)

    await logAuthSecurityEvent({
      action: "SESSION_REVOKED_SELF",
      userId: session.user.id,
      email: session.user.email || undefined,
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
      details: `sessionVersion=${newVersion ?? "unknown"}`,
    })

    return NextResponse.json({ ok: true, sessionVersion: newVersion })
  } catch (error) {
    console.error("Error revoking current user sessions:", error)
    return NextResponse.json({ error: "Error revoking sessions" }, { status: 500 })
  }
}
