import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { revokeIpAllowOverride } from "@/lib/security/ip-quarantine"
import { extractIpAddress, extractUserAgent, logAuthSecurityEvent } from "@/lib/services/file-audit.service"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ overrideId: string }> },
) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireRole(["SUPER_ADMIN"])
    const { overrideId } = await params
    const revoked = await revokeIpAllowOverride(overrideId)

    if (!revoked) {
      return NextResponse.json({ error: "Override not found" }, { status: 404 })
    }

    await logAuthSecurityEvent({
      action: "IP_OVERRIDE_ALLOW_REVOKED",
      userId: session.user.id,
      email: session.user.email || undefined,
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
      details: `overrideId=${overrideId}`,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error revoking IP allow override" }, { status: 500 })
  }
}
