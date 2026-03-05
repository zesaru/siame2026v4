import { NextRequest, NextResponse } from "next/server"
import { requireRole, AuthorizationError } from "@/lib/middleware/authorization"
import { readRecentCspReports } from "@/lib/services/csp-report.service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"])

    const limitParam = Number(req.nextUrl.searchParams.get("limit") || "50")
    const offsetParam = Number(req.nextUrl.searchParams.get("offset") || "0")
    const directive = req.nextUrl.searchParams.get("directive") || undefined
    const severityRaw = req.nextUrl.searchParams.get("severity") || undefined
    const severity =
      severityRaw === "high" || severityRaw === "medium" || severityRaw === "low"
        ? severityRaw
        : undefined
    const sortByRaw = req.nextUrl.searchParams.get("sortBy") || "timestamp"
    const sortBy = sortByRaw === "severity" ? "severity" : "timestamp"
    const startDateStr = req.nextUrl.searchParams.get("startDate") || undefined
    const endDateStr = req.nextUrl.searchParams.get("endDate") || undefined

    const limit = Number.isFinite(limitParam) ? limitParam : 200
    const offset = Number.isFinite(offsetParam) ? offsetParam : 0

    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined
    if (endDate) {
      endDate.setHours(23, 59, 59, 999)
    }

    const { reports, total } = await readRecentCspReports({
      limit,
      offset,
      directive,
      severity,
      startDate,
      endDate,
      sortBy,
    })
    return NextResponse.json({ reports, total, limit, offset, sortBy, severity })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error fetching CSP reports" }, { status: 500 })
  }
}
