#!/usr/bin/env node

import { spawnSync } from "node:child_process"

function toInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.trunc(n))
}

function parseAuditJson(raw) {
  try {
    return JSON.parse(raw || "{}")
  } catch {
    return {}
  }
}

const maxCritical = toInt(process.env.SECURITY_MAX_CRITICAL_VULNS || "0", 0)
const maxHigh = toInt(process.env.SECURITY_MAX_HIGH_VULNS || "999", 999)

const cmd = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
})

const raw = (cmd.stdout || "").trim()
const audit = parseAuditJson(raw)
const metadata = audit?.metadata?.vulnerabilities || {}

const critical = toInt(metadata.critical || 0, 0)
const high = toInt(metadata.high || 0, 0)
const moderate = toInt(metadata.moderate || 0, 0)
const low = toInt(metadata.low || 0, 0)

console.log(
  `[security:deps] critical=${critical} high=${high} moderate=${moderate} low=${low} | thresholds critical<=${maxCritical} high<=${maxHigh}`,
)

const criticalExceeded = critical > maxCritical
const highExceeded = high > maxHigh

if (criticalExceeded || highExceeded) {
  if (criticalExceeded) {
    console.error(`[security:deps] critical vulnerabilities exceed threshold (${critical} > ${maxCritical})`)
  }
  if (highExceeded) {
    console.error(`[security:deps] high vulnerabilities exceed threshold (${high} > ${maxHigh})`)
  }
  process.exit(1)
}

console.log("[security:deps] OK")
