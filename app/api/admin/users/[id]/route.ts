import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { canManageUser, canAssignRole, requireRole } from "@/lib/middleware/authorization"
import { AuthorizationError } from "@/lib/middleware/authorization"
import { prisma } from "@/lib/db"
import { GetUserByIdUseCase } from "@/modules/usuarios/application/queries"
import { DeleteUserUseCase, UpdateUserUseCase } from "@/modules/usuarios/application/use-cases"
import { toUpdatedUserDto, toUserDetailDto } from "@/modules/usuarios/application/mappers"
import { parseUpdateUserCommand } from "@/modules/usuarios/application/validation"
import { PrismaUserRepository } from "@/modules/usuarios/infrastructure"

export const revalidate = 30

/**
 * GET /api/admin/users/[id]
 * Get a single user by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"])

    const { id } = await params
    const repository = new PrismaUserRepository(prisma)
    const useCase = new GetUserByIdUseCase(repository)
    const result = await useCase.execute(id)

    if (!result.ok) {
      console.error("Error fetching user:", result.error)
      return NextResponse.json(
        { error: "Error fetching user" },
        { status: 500 }
      )
    }

    const user = result.value

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(toUserDetailDto(user))
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const repository = new PrismaUserRepository(prisma)
    const getUserUseCase = new GetUserByIdUseCase(repository)

    // Get target user to check roles
    const targetUserResult = await getUserUseCase.execute(id)

    if (!targetUserResult.ok) {
      console.error("Error fetching user:", targetUserResult.error)
      return NextResponse.json(
        { error: "Error updating user" },
        { status: 500 }
      )
    }

    const targetUser = targetUserResult.value

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
    const parsedBody = parseUpdateUserCommand(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "Validation error", details: parsedBody.error.details },
        { status: 400 }
      )
    }

    // If role is being updated, check if current user can assign the new role
    if (parsedBody.value.role && !canAssignRole(session.user.role, parsedBody.value.role)) {
      return NextResponse.json(
        { error: "You don't have permission to assign this role" },
        { status: 403 }
      )
    }

    const updateUserUseCase = new UpdateUserUseCase(repository)
    const updateResult = await updateUserUseCase.execute(id, parsedBody.value)

    if (!updateResult.ok) {
      console.error("Error updating user:", updateResult.error)
      return NextResponse.json(
        { error: "Error updating user" },
        { status: 500 }
      )
    }

    if (updateResult.value.status === "not_found") {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (updateResult.value.status === "email_exists") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(toUpdatedUserDto(updateResult.value.user))
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const repository = new PrismaUserRepository(prisma)
    const getUserUseCase = new GetUserByIdUseCase(repository)

    // Prevent users from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    // Get target user to check roles
    const targetUserResult = await getUserUseCase.execute(id)

    if (!targetUserResult.ok) {
      console.error("Error fetching user:", targetUserResult.error)
      return NextResponse.json(
        { error: "Error deleting user" },
        { status: 500 }
      )
    }

    const targetUser = targetUserResult.value

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

    const deleteUserUseCase = new DeleteUserUseCase(repository)
    const deleteResult = await deleteUserUseCase.execute(id)

    if (!deleteResult.ok) {
      console.error("Error deleting user:", deleteResult.error)
      return NextResponse.json(
        { error: "Error deleting user" },
        { status: 500 }
      )
    }

    if (deleteResult.value.status === "not_found") {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

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
