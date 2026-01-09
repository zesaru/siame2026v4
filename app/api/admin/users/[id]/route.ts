import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import * as userService from "@/lib/services/user.service"
import { updateUserSchema } from "@/lib/schemas/user"
import { canManageUser, canAssignRole, requireRole } from "@/lib/middleware/authorization"
import { AuthorizationError } from "@/lib/middleware/authorization"

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users/[id]
 * Get a single user by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"])

    const user = await userService.getUserById(params.id)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Error fetching user" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update a user
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await requireRole(["SUPER_ADMIN", "ADMIN"])

    // Get target user to check roles
    const targetUser = await userService.getUserById(params.id)

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if current user can manage target user
    if (!canManageUser(session.user.role, targetUser.role)) {
      return NextResponse.json(
        { error: "You don't have permission to manage this user" },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = updateUserSchema.parse(body)

    // If role is being updated, check if current user can assign the new role
    if (validatedData.role && !canAssignRole(session.user.role, validatedData.role)) {
      return NextResponse.json(
        { error: "You don't have permission to assign this role" },
        { status: 403 }
      )
    }

    // Update user
    const updatedUser = await userService.updateUser(params.id, validatedData)

    return NextResponse.json(updatedUser)
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

    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Error updating user" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await requireRole(["SUPER_ADMIN", "ADMIN"])

    // Prevent users from deleting themselves
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    // Get target user to check roles
    const targetUser = await userService.getUserById(params.id)

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if current user can manage target user
    if (!canManageUser(session.user.role, targetUser.role)) {
      return NextResponse.json(
        { error: "You don't have permission to delete this user" },
        { status: 403 }
      )
    }

    // Delete user
    await userService.deleteUser(params.id)

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Error deleting user" },
      { status: 500 }
    )
  }
}
