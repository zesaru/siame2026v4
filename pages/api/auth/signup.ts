import type { NextApiRequest, NextApiResponse } from "next"
import { z } from "zod"
import {
  authRateLimitCheck,
  authRateLimitRegisterFailure,
  authRateLimitRegisterSuccess,
} from "@/lib/security/auth-rate-limit"
import { authPersistentGuardCheck } from "@/lib/security/auth-persistent-guard"
import {
  isStrongPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/security/password-policy"
import { assertTrustedApiMutationRequest } from "@/lib/security/request-guard-api"
import { logAuthSecurityEvent } from "@/lib/services/file-audit.service"
import { createUser, emailExists } from "@/lib/services/auth.service"
const signupSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Registro deshabilitado en producción" })
  }

  try {
    try {
      assertTrustedApiMutationRequest(req)
    } catch {
      return res.status(403).json({ error: "Invalid request origin" })
    }

    const parsed = signupSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos" })
    }

    const { name, email, password } = parsed.data
    const normalizedEmail = String(email).trim().toLowerCase()
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress || null

    const decision = authRateLimitCheck({ ip, email: normalizedEmail })
    if (!decision.allowed) {
      res.setHeader("Retry-After", String(decision.retryAfterSec))
      void logAuthSecurityEvent({
        action: "SIGNUP_BLOCKED",
        email: normalizedEmail,
        ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
        userAgent: Array.isArray(req.headers["user-agent"]) ? req.headers["user-agent"][0] : req.headers["user-agent"],
      })
      return res.status(429).json({ error: "Demasiados intentos. Intenta nuevamente más tarde." })
    }

    const persistentDecision = await authPersistentGuardCheck({ ip, email: normalizedEmail })
    if (!persistentDecision.allowed) {
      res.setHeader("Retry-After", String(persistentDecision.retryAfterSec))
      void logAuthSecurityEvent({
        action: "SIGNUP_BLOCKED",
        email: normalizedEmail,
        ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
        userAgent: Array.isArray(req.headers["user-agent"]) ? req.headers["user-agent"][0] : req.headers["user-agent"],
        details: `persistent:${persistentDecision.reason};retryAfter=${persistentDecision.retryAfterSec}s`,
      })
      return res.status(429).json({ error: "Demasiados intentos. Intenta nuevamente más tarde." })
    }

    if (!name || !email || !password) {
      authRateLimitRegisterFailure({ ip, email: normalizedEmail })
      return res.status(400).json({ error: "Todos los campos son requeridos" })
    }

    if (!isStrongPassword(String(password))) {
      authRateLimitRegisterFailure({ ip, email: normalizedEmail })
      return res.status(400).json({
        error: PASSWORD_POLICY_MESSAGE,
      })
    }

    const existingUser = await emailExists(normalizedEmail)
    if (existingUser) {
      authRateLimitRegisterFailure({ ip, email: normalizedEmail })
      void logAuthSecurityEvent({
        action: "SIGNUP_BLOCKED",
        email: normalizedEmail,
        ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
        userAgent: Array.isArray(req.headers["user-agent"]) ? req.headers["user-agent"][0] : req.headers["user-agent"],
        details: "reason=email_exists",
      })
      return res.status(400).json({ error: "No fue posible crear cuenta con los datos proporcionados" })
    }

    const newUser = await createUser({
      name,
      email: normalizedEmail,
      password,
      role: "USER",
    })
    void logAuthSecurityEvent({
      action: "SIGNUP_SUCCESS",
      userId: newUser.id,
      email: normalizedEmail,
      ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
      userAgent: Array.isArray(req.headers["user-agent"]) ? req.headers["user-agent"][0] : req.headers["user-agent"],
    })
    authRateLimitRegisterSuccess({ ip, email: normalizedEmail })

    return res.status(201).json({
      message: "Usuario creado exitosamente",
      userId: newUser.id
    })
  } catch (error) {
    console.error("Signup error:", error)
    return res.status(500).json({ error: "Error interno del servidor" })
  }
}
