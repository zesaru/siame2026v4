#!/usr/bin/env node

import { spawnSync } from "node:child_process"

const args = process.argv.slice(2)
const dispatch = args.includes("--dispatch")
const workflow = "security-operations.yml"

function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
  })

  return {
    ok: res.status === 0,
    status: res.status,
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
  }
}

const auth = run("gh", ["auth", "status"])
const authCombined = `${auth.stdout}\n${auth.stderr}`.toLowerCase()
const authLooksInvalid =
  !auth.ok ||
  authCombined.includes("failed to log in") ||
  authCombined.includes("token") && authCombined.includes("invalid")

if (authLooksInvalid) {
  console.error("[security:gh-check] gh auth status failed")
  if (auth.stdout) console.error(auth.stdout)
  if (auth.stderr) console.error(auth.stderr)
  process.exit(1)
}

console.log("[security:gh-check] gh auth status OK")

if (!dispatch) {
  console.log(`[security:gh-check] dispatch skipped (use --dispatch to run ${workflow})`)
  process.exit(0)
}

const runResult = run("gh", ["workflow", "run", workflow])
if (!runResult.ok) {
  console.error(`[security:gh-check] failed to dispatch ${workflow}`)
  if (runResult.stdout) console.error(runResult.stdout)
  if (runResult.stderr) console.error(runResult.stderr)
  process.exit(1)
}

console.log(`[security:gh-check] dispatched ${workflow}`)
