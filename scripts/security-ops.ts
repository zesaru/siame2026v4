import { execSync } from "node:child_process"

function run(command: string, dryRun: boolean) {
  console.log(`[security:ops] running: ${command}`)
  if (!dryRun) {
    execSync(command, { stdio: "inherit" })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const force = args.includes("--force")

  run("node scripts/security-ops-preflight.mjs --strict", dryRun)
  run("node scripts/security-runtime-env-check.mjs", dryRun)
  run("node scripts/security-prune-auth-sessions.mjs", dryRun)
  run(`npx tsx scripts/security-notify-sla.ts${force ? " --force" : ""}`, dryRun)
  console.log("[security:ops] completed")
}

main().catch((error) => {
  console.error("[security:ops] ERROR", error)
  process.exit(1)
})
