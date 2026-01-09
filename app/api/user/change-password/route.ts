import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import * as userService from "@/lib/services/user.service"
import { changePasswordSchema } from "@/lib/schemas/user"

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/change-password
 * Change current user's password
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = changePasswordSchema.parse(body)

    // Change password
    await userService.changePassword(
      session.user.id,
      validatedData.currentPassword,
      validatedData.newPassword
    )

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === "Current password is incorrect") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Error changing password" },
      { status: 500 }
    )
  }
}
