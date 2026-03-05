import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AuthorizationError, canManageUser, requireRole } from "@/lib/middleware/authorization"
import { prisma } from "@/lib/db"
import { listUserActiveSessions } from "@/lib/security/auth-session-registry"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireRole(["SUPER_ADMIN", "ADMIN"])

    const { id: targetUserId } = await params
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
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

    const sessions = await listUserActiveSessions(targetUserId)
    return NextResponse.json({ sessions })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error listing user sessions:", error)
    return NextResponse.json({ error: "Error listing user sessions" }, { status: 500 })
  }
}
