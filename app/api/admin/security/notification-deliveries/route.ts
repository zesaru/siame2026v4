import { NextRequest, NextResponse } from "next/server"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { listNotificationDeliveries } from "@/lib/security/security-notifications"

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"])
    const limit = Number(req.nextUrl.searchParams.get("limit") || "30")
    const deliveries = await listNotificationDeliveries(limit)
    return NextResponse.json({ deliveries })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error fetching notification deliveries" }, { status: 500 })
  }
}
