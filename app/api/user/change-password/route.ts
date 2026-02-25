import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { ChangePasswordUseCase } from "@/modules/usuarios/application/use-cases"
import { parseChangePasswordCommand } from "@/modules/usuarios/application/validation"
import { PrismaUserRepository } from "@/modules/usuarios/infrastructure"

// POST mutations don't need force-dynamic (never cached anyway)

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
    const parsedBody = parseChangePasswordCommand(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "Validation error", details: parsedBody.error.details },
        { status: 400 }
      )
    }

    const repository = new PrismaUserRepository(prisma)
    const useCase = new ChangePasswordUseCase(repository)
    const result = await useCase.execute(session.user.id, parsedBody.value)

    if (!result.ok) {
      console.error("Error changing password:", result.error)
      return NextResponse.json(
        { error: "Error changing password" },
        { status: 500 }
      )
    }

    if (result.value.status === "invalid_current_password") {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Error changing password" },
      { status: 500 }
    )
  }
}
