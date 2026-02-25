import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { canAssignRole, requireRole } from "@/lib/middleware/authorization"
import { AuthorizationError } from "@/lib/middleware/authorization"
import { prisma } from "@/lib/db"
import { ListUsersUseCase } from "@/modules/usuarios/application/queries"
import { CreateUserUseCase } from "@/modules/usuarios/application/use-cases"
import { toCreatedUserDto, toUsersListDto } from "@/modules/usuarios/application/mappers"
import { parseCreateUserCommand } from "@/modules/usuarios/application/validation"
import { PrismaUserRepository } from "@/modules/usuarios/infrastructure"

export const revalidate = 30

/**
 * GET /api/admin/users
 * List all users (SUPER_ADMIN, ADMIN only)
 */
export async function GET() {
  try {
    // Check authentication
    await requireRole(["SUPER_ADMIN", "ADMIN"])

    const repository = new PrismaUserRepository(prisma)
    const useCase = new ListUsersUseCase(repository)
    const result = await useCase.execute()

    if (!result.ok) {
      console.error("Error fetching users:", result.error)
      return NextResponse.json(
        { error: "Error fetching users" },
        { status: 500 }
      )
    }

    return NextResponse.json(toUsersListDto(result.value))
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
    const parsedBody = parseCreateUserCommand(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "Validation error", details: parsedBody.error.details },
        { status: 400 }
      )
    }

    // Check if current user can assign the requested role
    if (!canAssignRole(session.user.role, parsedBody.value.role)) {
      return NextResponse.json(
        { error: "You don't have permission to assign this role" },
        { status: 403 }
      )
    }

    const repository = new PrismaUserRepository(prisma)
    const useCase = new CreateUserUseCase(repository)
    const result = await useCase.execute(parsedBody.value)

    if (!result.ok) {
      console.error("Error creating user:", result.error)
      return NextResponse.json(
        { error: "Error creating user" },
        { status: 500 }
      )
    }

    if (result.value.status === "email_exists") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(toCreatedUserDto(result.value.user), { status: 201 })
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Error creating user" },
      { status: 500 }
    )
  }
}
