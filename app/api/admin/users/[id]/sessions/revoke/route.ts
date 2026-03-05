import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AuthorizationError, canManageUser, requireRole } from "@/lib/middleware/authorization"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { prisma } from "@/lib/db"
import { revokeUserSessionsByUserId } from "@/lib/security/session-revocation"
import { extractIpAddress, extractUserAgent, logAuthSecurityEvent } from "@/lib/services/file-audit.service"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireRole(["SUPER_ADMIN", "ADMIN"])

    const { id: targetUserId } = await params
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!canManageUser(session.user.role, targetUser.role)) {
      return NextResponse.json(
        { error: "You don't have permission to manage this user" },
        { status: 403 },
      )
    }

    const newVersion = await revokeUserSessionsByUserId(targetUserId)

    await logAuthSecurityEvent({
      action: "SESSION_REVOKED_ADMIN",
      userId: targetUserId,
      email: targetUser.email,
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
      details: `by=${session.user.id};sessionVersion=${newVersion ?? "unknown"}`,
    })

    return NextResponse.json({ ok: true, userId: targetUserId, sessionVersion: newVersion })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error revoking user sessions:", error)
    return NextResponse.json({ error: "Error revoking user sessions" }, { status: 500 })
  }
}
