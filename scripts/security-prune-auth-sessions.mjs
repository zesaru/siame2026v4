#!/usr/bin/env node

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function parseDaysArg(argv) {
  const idx = argv.findIndex((arg) => arg === "--days")
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]
  return undefined
}

async function main() {
  const argValue = parseDaysArg(process.argv.slice(2))
  const raw = Number(argValue || process.env.AUTH_SESSION_RETENTION_DAYS || "30")
  const retentionDays = Number.isFinite(raw) ? Math.max(1, Math.trunc(raw)) : 30
  const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  const deleted = await prisma.$executeRaw`
    DELETE FROM "AuthSession"
    WHERE ("revokedAt" IS NOT NULL AND "revokedAt" < ${threshold})
       OR ("expiresAt" < ${threshold})
  `

  console.log(
    `[security:prune-sessions] OK - deleted=${Number(deleted)} retentionDays=${retentionDays} threshold=${threshold.toISOString()}`,
  )
}

main()
  .catch((error) => {
    console.error("[security:prune-sessions] ERROR", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
