#!/usr/bin/env node

import fs from "node:fs"

const args = process.argv.slice(2)
const strictFlag = args.includes("--strict")
const isProduction = process.env.NODE_ENV === "production"
const strict = strictFlag || isProduction
const cwd = process.cwd()

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) return null
  const eq = trimmed.indexOf("=")
  if (eq <= 0) return null
  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return { key, value }
}

function loadEnvFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const map = {}
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue
      map[parsed.key] = parsed.value
    }
    return map
  } catch {
    return {}
  }
}

const envFromFiles = {
  ...loadEnvFromFile(`${cwd}/.env`),
  ...loadEnvFromFile(`${cwd}/.env.local`),
}

function getEnv(key) {
  return process.env[key] ?? envFromFiles[key]
}

const required = ["DATABASE_URL", "NEXTAUTH_SECRET"]
const optionalButImportant = [
  "NEXTAUTH_URL",
  "AZURE_FORM_RECOGNIZER_ENDPOINT",
  "AZURE_FORM_RECOGNIZER_KEY",
  "AUTH_MAX_ACTIVE_SESSIONS",
  "AUTH_SESSION_IDLE_TIMEOUT_MINUTES",
  "AUTH_SESSION_RETENTION_DAYS",
  "SECURITY_ALERT_WINDOW_MINUTES",
  "SECURITY_ALERT_LOGIN_FAILED_THRESHOLD",
  "SECURITY_ALERT_SESSION_POLICY_THRESHOLD",
  "SECURITY_ALERT_IP_QUARANTINE_THRESHOLD",
  "SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD",
  "SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD",
  "SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD",
  "SECURITY_TRUSTED_HOSTS",
  "SECURITY_CSP_ALLOW_UNSAFE_EVAL",
  "AUTH_IP_QUARANTINE_THRESHOLD",
  "AUTH_IP_QUARANTINE_WINDOW_MINUTES",
  "AUTH_IP_UNBLOCK_DEFAULT_MINUTES",
  "SECURITY_INCIDENT_SLA_HIGH_MINUTES",
  "SECURITY_INCIDENT_SLA_MEDIUM_MINUTES",
  "SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL",
  "SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT",
  "SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES",
  "SECURITY_INCIDENT_NOTIFY_MAX_RETRIES",
  "SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS",
  "SECURITY_MAX_CRITICAL_VULNS",
  "SECURITY_MAX_HIGH_VULNS",
  "AUTH_ACCOUNT_LOCK_THRESHOLD",
  "AUTH_ACCOUNT_LOCK_MINUTES",
]

const insecurePatterns = [
  {
    key: "NEXTAUTH_SECRET",
    test: (v) => v === "your-secret-key-change-this-in-production",
    message: "NEXTAUTH_SECRET está en valor por defecto",
  },
  {
    key: "SUPER_ADMIN_PASSWORD",
    test: (v) => v === "ChangeMe123!",
    message: "SUPER_ADMIN_PASSWORD está en valor por defecto",
  },
  {
    key: "AZURE_FORM_RECOGNIZER_ENDPOINT",
    test: (v) => v === "your-azure-endpoint",
    message: "AZURE_FORM_RECOGNIZER_ENDPOINT está en valor de ejemplo",
  },
]

function mask(value = "") {
  if (!value) return ""
  if (value.length <= 6) return "***"
  return `${value.slice(0, 3)}***${value.slice(-2)}`
}

const errors = []
const warnings = []

for (const key of required) {
  if (!getEnv(key)) {
    errors.push(`${key} no está definido`)
  }
}

for (const key of optionalButImportant) {
  if (!getEnv(key)) {
    warnings.push(`${key} no está definido`)
  }
}

if (getEnv("NEXTAUTH_SECRET") && getEnv("NEXTAUTH_SECRET").length < 32) {
  errors.push("NEXTAUTH_SECRET debe tener al menos 32 caracteres")
}

if (getEnv("DATABASE_URL")) {
  try {
    const url = new URL(getEnv("DATABASE_URL"))
    if (!url.username) {
      errors.push("DATABASE_URL no tiene usuario")
    }
    if (!url.password) {
      errors.push("DATABASE_URL no tiene password")
    }
    if (!url.pathname || url.pathname === "/") {
      errors.push("DATABASE_URL no tiene nombre de base de datos")
    }
  } catch {
    errors.push("DATABASE_URL no tiene formato URL válido")
  }
}

if (getEnv("AUTH_MAX_ACTIVE_SESSIONS")) {
  const limit = Number(getEnv("AUTH_MAX_ACTIVE_SESSIONS"))
  if (!Number.isFinite(limit) || limit < 1) {
    errors.push("AUTH_MAX_ACTIVE_SESSIONS debe ser un entero >= 1")
  }
}

if (getEnv("AUTH_SESSION_IDLE_TIMEOUT_MINUTES")) {
  const limit = Number(getEnv("AUTH_SESSION_IDLE_TIMEOUT_MINUTES"))
  if (!Number.isFinite(limit) || limit < 1) {
    errors.push("AUTH_SESSION_IDLE_TIMEOUT_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("AUTH_SESSION_RETENTION_DAYS")) {
  const days = Number(getEnv("AUTH_SESSION_RETENTION_DAYS"))
  if (!Number.isFinite(days) || days < 1) {
    errors.push("AUTH_SESSION_RETENTION_DAYS debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_WINDOW_MINUTES")) {
  const v = Number(getEnv("SECURITY_ALERT_WINDOW_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_WINDOW_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_LOGIN_FAILED_THRESHOLD")) {
  const v = Number(getEnv("SECURITY_ALERT_LOGIN_FAILED_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_LOGIN_FAILED_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_SESSION_POLICY_THRESHOLD")) {
  const v = Number(getEnv("SECURITY_ALERT_SESSION_POLICY_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_SESSION_POLICY_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_IP_QUARANTINE_THRESHOLD")) {
  const v = Number(getEnv("SECURITY_ALERT_IP_QUARANTINE_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_IP_QUARANTINE_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD")) {
  const v = Number(getEnv("SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD")) {
  const v = Number(getEnv("SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD")) {
  const v = Number(getEnv("SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_CSP_ALLOW_UNSAFE_EVAL")) {
  const v = String(getEnv("SECURITY_CSP_ALLOW_UNSAFE_EVAL")).toLowerCase()
  if (v !== "true" && v !== "false") {
    errors.push("SECURITY_CSP_ALLOW_UNSAFE_EVAL debe ser true o false")
  }
}

if (getEnv("SECURITY_TRUSTED_HOSTS")) {
  const hosts = String(getEnv("SECURITY_TRUSTED_HOSTS"))
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)

  if (hosts.length === 0) {
    errors.push("SECURITY_TRUSTED_HOSTS debe incluir al menos un host válido")
  }

  for (const host of hosts) {
    if (host.includes("://") || host.includes("/") || /\s/.test(host)) {
      errors.push(`SECURITY_TRUSTED_HOSTS contiene host inválido: ${host}`)
    }
  }
}

if (getEnv("AUTH_IP_QUARANTINE_THRESHOLD")) {
  const v = Number(getEnv("AUTH_IP_QUARANTINE_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("AUTH_IP_QUARANTINE_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("AUTH_IP_QUARANTINE_WINDOW_MINUTES")) {
  const v = Number(getEnv("AUTH_IP_QUARANTINE_WINDOW_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("AUTH_IP_QUARANTINE_WINDOW_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("AUTH_IP_UNBLOCK_DEFAULT_MINUTES")) {
  const v = Number(getEnv("AUTH_IP_UNBLOCK_DEFAULT_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("AUTH_IP_UNBLOCK_DEFAULT_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_INCIDENT_SLA_HIGH_MINUTES")) {
  const v = Number(getEnv("SECURITY_INCIDENT_SLA_HIGH_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_INCIDENT_SLA_HIGH_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_INCIDENT_SLA_MEDIUM_MINUTES")) {
  const v = Number(getEnv("SECURITY_INCIDENT_SLA_MEDIUM_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_INCIDENT_SLA_MEDIUM_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL")) {
  try {
    const u = new URL(getEnv("SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL"))
    if (!u.protocol.startsWith("http")) {
      errors.push("SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL debe usar http/https")
    }
  } catch {
    errors.push("SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL no es una URL válida")
  }
}

if (getEnv("SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT")) {
  const v = Number(getEnv("SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES")) {
  const v = Number(getEnv("SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_INCIDENT_NOTIFY_MAX_RETRIES")) {
  const v = Number(getEnv("SECURITY_INCIDENT_NOTIFY_MAX_RETRIES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("SECURITY_INCIDENT_NOTIFY_MAX_RETRIES debe ser un entero >= 1")
  }
}

if (getEnv("SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS")) {
  const v = Number(getEnv("SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS"))
  if (!Number.isFinite(v) || v < 1000) {
    errors.push("SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS debe ser un entero >= 1000")
  }
}

if (getEnv("SECURITY_MAX_CRITICAL_VULNS")) {
  const v = Number(getEnv("SECURITY_MAX_CRITICAL_VULNS"))
  if (!Number.isFinite(v) || v < 0) {
    errors.push("SECURITY_MAX_CRITICAL_VULNS debe ser un entero >= 0")
  }
}

if (getEnv("SECURITY_MAX_HIGH_VULNS")) {
  const v = Number(getEnv("SECURITY_MAX_HIGH_VULNS"))
  if (!Number.isFinite(v) || v < 0) {
    errors.push("SECURITY_MAX_HIGH_VULNS debe ser un entero >= 0")
  }
}

if (getEnv("AUTH_ACCOUNT_LOCK_THRESHOLD")) {
  const v = Number(getEnv("AUTH_ACCOUNT_LOCK_THRESHOLD"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("AUTH_ACCOUNT_LOCK_THRESHOLD debe ser un entero >= 1")
  }
}

if (getEnv("AUTH_ACCOUNT_LOCK_MINUTES")) {
  const v = Number(getEnv("AUTH_ACCOUNT_LOCK_MINUTES"))
  if (!Number.isFinite(v) || v < 1) {
    errors.push("AUTH_ACCOUNT_LOCK_MINUTES debe ser un entero >= 1")
  }
}

for (const rule of insecurePatterns) {
  const value = getEnv(rule.key)
  if (value && rule.test(value)) {
    errors.push(rule.message)
  }
}

if (warnings.length > 0) {
  console.warn("[security:env] Advertencias:")
  for (const w of warnings) {
    console.warn(`- ${w}`)
  }
}

if (errors.length > 0) {
  const mode = strict ? "BLOQUEANTE" : "NO BLOQUEANTE"
  const sanitizedDb = getEnv("DATABASE_URL")
    ? (() => {
        try {
          const u = new URL(getEnv("DATABASE_URL"))
          return `${u.protocol}//${u.username}:${mask(u.password)}@${u.host}${u.pathname}`
        } catch {
          return "<invalid>"
        }
      })()
    : "<missing>"

  console.error(`[security:env] ${mode} - problemas detectados:`)
  for (const e of errors) {
    console.error(`- ${e}`)
  }
  console.error(`[security:env] DATABASE_URL actual: ${sanitizedDb}`)

  if (strict) process.exit(1)
}

if (errors.length === 0) {
  console.log("[security:env] OK - configuración mínima segura")
} else {
  console.log("[security:env] Continuando porque no está en modo estricto")
}
