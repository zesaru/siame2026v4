import { NextRequest, NextResponse } from "next/server"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { listSecurityIncidents } from "@/lib/security/security-incidents"

export const dynamic = "force-dynamic"

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] || String(fallback))
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.trunc(raw))
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"])

    const limit = Number(req.nextUrl.searchParams.get("limit") || "50")
    const offset = Number(req.nextUrl.searchParams.get("offset") || "0")
    const statusRaw = req.nextUrl.searchParams.get("status") || "all"
    const slaBreachedRaw = req.nextUrl.searchParams.get("slaBreached") || "false"
    const status =
      statusRaw === "open" || statusRaw === "ack" || statusRaw === "resolved" || statusRaw === "all"
        ? statusRaw
        : "all"
    const slaBreached = slaBreachedRaw === "true"
    const startDateStr = req.nextUrl.searchParams.get("startDate") || undefined
    const endDateStr = req.nextUrl.searchParams.get("endDate") || undefined
    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined
    if (endDate) endDate.setHours(23, 59, 59, 999)

    const result = await listSecurityIncidents({
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
      startDate,
      endDate,
      status,
      slaBreached,
      slaHighMinutes: envInt("SECURITY_INCIDENT_SLA_HIGH_MINUTES", 30),
      slaMediumMinutes: envInt("SECURITY_INCIDENT_SLA_MEDIUM_MINUTES", 120),
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error fetching incidents" }, { status: 500 })
  }
}
