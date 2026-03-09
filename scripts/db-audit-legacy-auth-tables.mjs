#!/usr/bin/env node

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const legacyTables = ["Account", "Session", "VerificationToken"]

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS "exists"`,
    tableName,
  )

  return Boolean(rows?.[0]?.exists)
}

async function tableCount(tableName) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${tableName}"`)
  return Number(rows?.[0]?.count ?? 0)
}

async function main() {
  console.log("[db:audit:legacy-auth] Inspecting legacy auth tables...\n")

  let tablesFound = 0

  for (const tableName of legacyTables) {
    const exists = await tableExists(tableName)
    if (!exists) {
      console.log(`- ${tableName}: not present`)
      continue
    }

    tablesFound += 1
    const count = await tableCount(tableName)
    console.log(`- ${tableName}: present, rows=${count}`)
  }

  console.log("")

  if (tablesFound === 0) {
    console.log("[db:audit:legacy-auth] OK - no legacy auth tables remain")
    return
  }

  console.log("[db:audit:legacy-auth] Review row counts before applying cleanup migration")
}

main()
  .catch((error) => {
    console.error("[db:audit:legacy-auth] ERROR", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
