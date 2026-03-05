import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { revokeAuthSessionById } from "@/lib/security/auth-session-registry"
import { extractIpAddress, extractUserAgent, logAuthSecurityEvent } from "@/lib/services/file-audit.service"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await params
    const revoked = await revokeAuthSessionById(sessionId, session.user.id)
    if (!revoked) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    await logAuthSecurityEvent({
      action: "SESSION_REVOKED_SELF",
      userId: session.user.id,
      email: session.user.email || undefined,
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
      details: `scope=single;sessionId=${sessionId}`,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error revoking active session:", error)
    return NextResponse.json({ error: "Error revoking active session" }, { status: 500 })
  }
}
