import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db"
import {
  authRateLimitCheck,
  authRateLimitRegisterFailure,
  authRateLimitRegisterSuccess,
} from "@/lib/security/auth-rate-limit"
import { logAuthSecurityEvent } from "@/lib/services/file-audit.service"
import { authPersistentGuardCheck } from "@/lib/security/auth-persistent-guard"
import { getUserSessionVersion } from "@/lib/security/session-revocation"
import { authenticateWithLockout } from "@/lib/security/account-lockout"
import {
  createAuthSession,
  isAuthSessionActiveWithIdleWindow,
  revokeAuthSessionById,
  touchAuthSession,
} from "@/lib/security/auth-session-registry"

const AUTH_FAILURE_BASE_DELAY_MS = 450
const AUTH_FAILURE_JITTER_MS = 300
const AUTH_SESSION_TTL_SECONDS = 8 * 60 * 60
const AUTH_MAX_ACTIVE_SESSIONS = (() => {
  const raw = Number(process.env.AUTH_MAX_ACTIVE_SESSIONS || "3")
  if (!Number.isFinite(raw)) return 3
  return Math.max(1, Math.trunc(raw))
})()
const AUTH_SESSION_IDLE_TIMEOUT_MINUTES = (() => {
  const raw = Number(process.env.AUTH_SESSION_IDLE_TIMEOUT_MINUTES || "120")
  if (!Number.isFinite(raw)) return 120
  return Math.max(1, Math.trunc(raw))
})()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function failureDelay() {
  const jitter = Math.floor(Math.random() * AUTH_FAILURE_JITTER_MS)
  await sleep(AUTH_FAILURE_BASE_DELAY_MS + jitter)
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          await failureDelay()
          return null
        }

        const ip = req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || null
        const userAgent = req?.headers?.["user-agent"] || null
        const email = credentials.email.trim().toLowerCase()

        const persistentDecision = await authPersistentGuardCheck({ ip, email })
        if (!persistentDecision.allowed) {
          await logAuthSecurityEvent({
            action: "LOGIN_BLOCKED",
            email,
            ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || undefined,
            details: `persistent:${persistentDecision.reason};retryAfter=${persistentDecision.retryAfterSec}s`,
          })
          await failureDelay()
          throw new Error(`RATE_LIMITED:${persistentDecision.retryAfterSec}`)
        }

        const decision = authRateLimitCheck({ ip, email })
        if (!decision.allowed) {
          await logAuthSecurityEvent({
            action: "LOGIN_BLOCKED",
            email,
            ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || undefined,
            details: `retryAfter=${decision.retryAfterSec}s`,
          })
          await failureDelay()
          throw new Error(`RATE_LIMITED:${decision.retryAfterSec}`)
        }

        const authResult = await authenticateWithLockout(credentials.email, credentials.password)

        if (authResult.status === "invalid") {
          authRateLimitRegisterFailure({ ip, email })
          await logAuthSecurityEvent({
            action: "LOGIN_FAILED",
            email,
            ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || undefined,
          })
          await failureDelay()
          return null
        }

        if (authResult.status === "locked") {
          await logAuthSecurityEvent({
            action: "LOGIN_BLOCKED",
            email,
            ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || undefined,
            details: `persistent:${authResult.reason};retryAfter=${authResult.retryAfterSec}s`,
          })
          await failureDelay()
          throw new Error(`RATE_LIMITED:${authResult.retryAfterSec}`)
        }

        const user = authResult.user

        authRateLimitRegisterSuccess({ ip, email })
        await logAuthSecurityEvent({
          action: "LOGIN_SUCCESS",
          userId: user.id,
          email: user.email,
          ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
          userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || undefined,
        })

        const sessionVersion = (await getUserSessionVersion(user.id)) ?? 0
        const { sessionId, revokedOlderCount } = await createAuthSession({
          userId: user.id,
          ipAddress: Array.isArray(ip) ? ip[0] : ip,
          userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
          ttlSeconds: AUTH_SESSION_TTL_SECONDS,
          maxActiveSessions: AUTH_MAX_ACTIVE_SESSIONS,
        })
        if (revokedOlderCount > 0) {
          await logAuthSecurityEvent({
            action: "SESSION_REVOKED_POLICY",
            userId: user.id,
            email: user.email,
            ipAddress: Array.isArray(ip) ? ip[0] : ip || undefined,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || undefined,
            details: `maxActive=${AUTH_MAX_ACTIVE_SESSIONS};revoked=${revokedOlderCount}`,
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion,
          sessionId,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8h
    updateAge: 60 * 60, // 1h
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0
        token.sid = (user as { sessionId?: string }).sessionId
        token.revoked = false
      }

      if (token.id) {
        const currentVersion = await getUserSessionVersion(token.id as string)
        if (currentVersion === null) {
          token.revoked = true
          return token
        }

        const tokenVersion = Number(token.sessionVersion ?? 0)
        if (tokenVersion !== currentVersion) {
          token.revoked = true
          return token
        }
      }

      if (token.sid) {
        const active = await isAuthSessionActiveWithIdleWindow(
          String(token.sid),
          AUTH_SESSION_IDLE_TIMEOUT_MINUTES,
        )
        if (!active) {
          await revokeAuthSessionById(String(token.sid))
          await logAuthSecurityEvent({
            action: "SESSION_REVOKED_POLICY",
            userId: token.id ? String(token.id) : undefined,
            details: `reason=idle_or_expired;maxIdleMinutes=${AUTH_SESSION_IDLE_TIMEOUT_MINUTES}`,
          })
          token.revoked = true
          return token
        }
        await touchAuthSession(String(token.sid))
      }

      return token
    },
    async session({ session, token }) {
      if (token?.revoked) {
        return null as any
      }

      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.sessionVersion = Number(token.sessionVersion ?? 0)
        session.user.sessionId = token.sid ? String(token.sid) : undefined
      }
      return session
    }
  }
}

export default NextAuth(authOptions)
