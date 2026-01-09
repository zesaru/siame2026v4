import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import * as userService from "@/lib/services/user.service"
import { createUserSchema } from "@/lib/schemas/user"
import { canAssignRole, requireRole } from "@/lib/middleware/authorization"
import { AuthorizationError } from "@/lib/middleware/authorization"

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users
 * List all users (SUPER_ADMIN, ADMIN only)
 */
export async function GET() {
  try {
    // Check authentication
    await requireRole(["SUPER_ADMIN", "ADMIN"])

    const users = await userService.listUsers()

    return NextResponse.json(users)
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Error fetching users" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Create a new user (SUPER_ADMIN, ADMIN only)
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await requireRole(["SUPER_ADMIN", "ADMIN"])

    // Parse and validate request body
    const body = await req.json()
    const validatedData = createUserSchema.parse(body)

    // Check if current user can assign the requested role
    if (!canAssignRole(session.user.role, validatedData.role)) {
      return NextResponse.json(
        { error: "You don't have permission to assign this role" },
        { status: 403 }
      )
    }

    // Create user
    const user = await userService.createUser(validatedData)

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Error creating user" },
      { status: 500 }
    )
  }
}
