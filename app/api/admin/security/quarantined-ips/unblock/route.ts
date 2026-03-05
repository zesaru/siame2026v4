import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { createIpAllowOverride } from "@/lib/security/ip-quarantine"
import { extractIpAddress, extractUserAgent, logAuthSecurityEvent } from "@/lib/services/file-audit.service"

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] || String(fallback))
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.trunc(raw))
}

export async function POST(req: NextRequest) {
  try {
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireRole(["SUPER_ADMIN"])

    const body = await req.json().catch(() => ({}))
    const ipAddress = typeof body.ipAddress === "string" ? body.ipAddress.trim() : ""
    if (!ipAddress) {
      return NextResponse.json({ error: "ipAddress is required" }, { status: 400 })
    }

    const durationMinutes =
      Number.isFinite(Number(body.durationMinutes))
        ? Math.max(1, Math.trunc(Number(body.durationMinutes)))
        : envInt("AUTH_IP_UNBLOCK_DEFAULT_MINUTES", 120)

    const reason = typeof body.reason === "string" ? body.reason.trim() : "manual-unblock"

    const result = await createIpAllowOverride({
      ipAddress,
      createdByUserId: session.user.id,
      reason,
      durationMinutes,
    })

    await logAuthSecurityEvent({
      action: "IP_OVERRIDE_ALLOW_ADDED",
      userId: session.user.id,
      email: session.user.email || undefined,
      ipAddress: extractIpAddress(req),
      userAgent: extractUserAgent(req),
      details: `targetIp=${ipAddress};durationMin=${durationMinutes};reason=${reason};overrideId=${result.id}`,
    })

    return NextResponse.json({
      ok: true,
      overrideId: result.id,
      expiresAt: result.expiresAt,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error creating IP allow override" }, { status: 500 })
  }
}
