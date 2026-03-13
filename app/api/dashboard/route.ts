import { NextResponse } from "next/server"
import { getDashboardMetrics } from "@/lib/dashboard"
import { auth } from "@/lib/auth-v4"

export const dynamic = "force-dynamic"
export const revalidate = 300

export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const metrics = await getDashboardMetrics({
      userId: session.user.id,
      role: session.user.role,
    })

    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "CDN-Cache-Control": "public, s-maxage=300",
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
