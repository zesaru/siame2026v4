import { NextRequest, NextResponse } from "next/server"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { listQuarantinedIps } from "@/lib/security/ip-quarantine"

export const dynamic = "force-dynamic"

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] || String(fallback))
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.trunc(raw))
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"])

    const limitParam = Number(req.nextUrl.searchParams.get("limit") || "100")
    const limit = Number.isFinite(limitParam) ? limitParam : 100
    const windowMinutes = envInt("AUTH_IP_QUARANTINE_WINDOW_MINUTES", 60)
    const threshold = envInt("AUTH_IP_QUARANTINE_THRESHOLD", 80)

    const items = await listQuarantinedIps({ windowMinutes, threshold, limit })
    return NextResponse.json({
      items,
      config: { windowMinutes, threshold, limit },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error fetching quarantined IPs" }, { status: 500 })
  }
}
