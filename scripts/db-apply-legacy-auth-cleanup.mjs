#!/usr/bin/env node

import { execSync } from "node:child_process"

function run(command, dryRun) {
  console.log(`[db:cleanup:legacy-auth] running: ${command}`)
  if (!dryRun) {
    execSync(command, { stdio: "inherit" })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  run("node scripts/db-audit-legacy-auth-tables.mjs", dryRun)
  run("npx prisma migrate deploy", dryRun)
  run("npx tsx scripts/verify-data.ts", dryRun)

  console.log("[db:cleanup:legacy-auth] completed")
}

main().catch((error) => {
  console.error("[db:cleanup:legacy-auth] ERROR", error)
  process.exit(1)
})
