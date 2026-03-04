#!/usr/bin/env node

const args = process.argv.slice(2)
const force = args.includes("--force")
const dryRun = args.includes("--dry-run")
const urlArg = args.find((arg) => arg.startsWith("--url="))
const webhookUrl = (urlArg ? urlArg.slice("--url=".length) : process.env.SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL || "").trim()

const payload = {
  event: "security_incident_sla_breach_probe",
  source: "manual_probe",
  forced: force,
  generatedAt: new Date().toISOString(),
  incidents: [],
  stats: {
    breachedCount: 0,
    note: "probe-only",
  },
}

if (dryRun) {
  console.log("[security:webhook:probe] dry-run payload")
  console.log(JSON.stringify(payload, null, 2))
  console.log(`[security:webhook:probe] target=${webhookUrl || "(none)"}`)
  process.exit(0)
}

if (!webhookUrl) {
  console.error("[security:webhook:probe] Missing SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL (or --url=...)")
  process.exit(1)
}

const controller = new AbortController()
const timeoutMs = Number(process.env.SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS || "5000")
const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 5000)

try {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "siame-security-webhook-probe/1.0",
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })

  const bodyText = await res.text().catch(() => "")
  console.log(`[security:webhook:probe] status=${res.status}`)
  if (bodyText) {
    console.log(`[security:webhook:probe] response=${bodyText.slice(0, 500)}`)
  }

  if (!res.ok) {
    process.exit(1)
  }
} catch (error) {
  console.error("[security:webhook:probe] ERROR", error)
  process.exit(1)
} finally {
  clearTimeout(timeout)
}
