import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { upsertSecurityIncidentState } from "@/lib/security/security-incidents"
import { extractIpAddress, extractUserAgent, logFileOperation } from "@/lib/services/file-audit.service"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await requireRole(["SUPER_ADMIN"])

    const body = await req.json().catch(() => ({}))
    const status = typeof body.status === "string" ? body.status : ""
    const note = typeof body.note === "string" ? body.note.trim() : ""
    if (status !== "open" && status !== "ack" && status !== "resolved") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const { id } = await params
    await upsertSecurityIncidentState({
      id,
      status,
      note: note || undefined,
      updatedByUserId: session.user.id,
    })

    await logFileOperation({
      action: "UPDATE",
      userId: session.user.id,
      filePath: `SECURITY_INCIDENT/${id}`,
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error updating incident state" }, { status: 500 })
  }
}
