import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { getAuditLogsForAdmin } from "@/lib/services/file-audit.service"
import { requireRole } from "@/lib/middleware/authorization"
import { AuthorizationError } from "@/lib/middleware/authorization"

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit-logs
 * Get all audit logs with filters (SUPER_ADMIN only)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"])

    const { searchParams } = new URL(req.url)
    const documentType = searchParams.get("documentType") as any || undefined
    const action = searchParams.get("action") as any || undefined
    const userSearch = searchParams.get("userSearch") || undefined
    const startDateStr = searchParams.get("startDate") || undefined
    const endDateStr = searchParams.get("endDate") || undefined
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build filters
    const filters: any = {
      limit,
      offset,
    }

    if (documentType) filters.documentType = documentType
    if (action) filters.action = action
    if (userSearch) filters.userSearch = userSearch

    if (startDateStr) {
      filters.startDate = new Date(startDateStr)
    }
    if (endDateStr) {
      filters.endDate = new Date(endDateStr)
      // Set end date to end of day
      filters.endDate.setHours(23, 59, 59, 999)
    }

    // For user search, we need to get user IDs first (this would require extending the service)
    // For now, we'll pass it through and let the service handle it or we handle it in the query
    // We'll keep it simple and filter by userId if provided directly

    const { logs, total } = await getAuditLogsForAdmin(filters)

    return NextResponse.json({ logs, total })
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      { error: "Error fetching audit logs" },
      { status: 500 }
    )
  }
}
