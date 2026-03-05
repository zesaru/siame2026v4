import { NextResponse } from "next/server"
import { AuthorizationError, requireRole } from "@/lib/middleware/authorization"
import { getSessionSecurityMetrics } from "@/lib/security/session-security-metrics"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"])
    const metrics = await getSessionSecurityMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error fetching session metrics" }, { status: 500 })
  }
}
