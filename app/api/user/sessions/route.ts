import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { listUserActiveSessions } from "@/lib/security/auth-session-registry"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessions = await listUserActiveSessions(session.user.id)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error listing active sessions:", error)
    return NextResponse.json({ error: "Error listing active sessions" }, { status: 500 })
  }
}
