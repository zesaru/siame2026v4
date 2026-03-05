import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { assertTrustedMutationRequest } from "@/lib/security/request-guard"
import { revokeAllActiveSessionsByUserId } from "@/lib/security/auth-session-registry"
import {
  authRateLimitCheck,
  authRateLimitRegisterFailure,
  authRateLimitRegisterSuccess,
} from "@/lib/security/auth-rate-limit"
import { extractIpAddress, extractUserAgent, logAuthSecurityEvent } from "@/lib/services/file-audit.service"
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
    assertTrustedMutationRequest(req)

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const ip = extractIpAddress(req) || null
    const userAgent = extractUserAgent(req)
    const rateLimitIdentity = `pwdchg:${session.user.id}`
    const rateLimitDecision = authRateLimitCheck({ ip, email: rateLimitIdentity })
    if (!rateLimitDecision.allowed) {
      await logAuthSecurityEvent({
        action: "PASSWORD_CHANGE_BLOCKED",
        userId: session.user.id,
        email: session.user.email || undefined,
        ipAddress: ip || undefined,
        userAgent: userAgent || undefined,
        details: `reason=rate_limit;retryAfter=${rateLimitDecision.retryAfterSec}s`,
      })
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitDecision.retryAfterSec),
          },
        }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const parsedBody = parseChangePasswordCommand(body)

    if (!parsedBody.ok) {
      authRateLimitRegisterFailure({ ip, email: rateLimitIdentity })
      await logAuthSecurityEvent({
        action: "PASSWORD_CHANGE_FAILED",
        userId: session.user.id,
        email: session.user.email || undefined,
        ipAddress: ip || undefined,
        userAgent: userAgent || undefined,
        details: "reason=validation",
      })
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
      authRateLimitRegisterFailure({ ip, email: rateLimitIdentity })
      await logAuthSecurityEvent({
        action: "PASSWORD_CHANGE_FAILED",
        userId: session.user.id,
        email: session.user.email || undefined,
        ipAddress: ip || undefined,
        userAgent: userAgent || undefined,
        details: "reason=invalid_current_password",
      })
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    let revokedAuthSessions = 0
    if (result.value.status === "changed") {
      authRateLimitRegisterSuccess({ ip, email: rateLimitIdentity })
      revokedAuthSessions = await revokeAllActiveSessionsByUserId(session.user.id)
      await logAuthSecurityEvent({
        action: "SESSION_REVOKED_SELF",
        userId: session.user.id,
        email: session.user.email || undefined,
        ipAddress: ip || undefined,
        userAgent: userAgent || undefined,
        details: `reason=password_changed;authSessionsRevoked=${revokedAuthSessions}`,
      })
    }

    return NextResponse.json(
      {
        message: "Password changed successfully",
        requireReauth: true,
        revokedAuthSessions,
      },
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
