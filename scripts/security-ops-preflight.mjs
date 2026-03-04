#!/usr/bin/env node

const args = process.argv.slice(2)
const strict = args.includes("--strict")

const required = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL",
]

const missing = required.filter((name) => !process.env[name] || String(process.env[name]).trim() === "")

if (missing.length > 0) {
  console.error("[security:ops:preflight] Missing required env vars:")
  for (const name of missing) {
    console.error(`- ${name}`)
  }
  if (strict) {
    process.exit(1)
  }
} else {
  console.log("[security:ops:preflight] OK")
}
