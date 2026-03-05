import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"
import { listSecurityIncidents } from "@/lib/security/security-incidents"

export interface SlaNotificationResult {
  enabled: boolean
  sent: boolean
  breachCount: number
  minRequired: number
  source?: "manual" | "scheduled"
  skippedByCooldown?: boolean
  cooldownMinutes?: number
  attemptCount?: number
  deliveryId?: string
  reason?: string
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] || String(fallback))
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.trunc(raw))
}

function getWebhookUrl(): string | null {
  const url = (process.env.SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL || "").trim()
  return url || null
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = (process.env[name] || "").trim().toLowerCase()
  if (!raw) return fallback
  return raw === "1" || raw === "true" || raw === "yes"
}

async function recordDelivery(input: {
  channel: string
  eventKey: string
  status: "sent" | "skipped" | "failed"
  source: "manual" | "scheduled"
  attemptCount: number
  breachCount: number
  httpStatusCode?: number
  errorMessage?: string
  metadata?: unknown
}): Promise<string> {
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "SecurityNotificationDelivery"
      ("id", "channel", "eventKey", "status", "source", "attemptCount", "breachCount", "httpStatusCode", "errorMessage", "metadata")
    VALUES
      (${id}, ${input.channel}, ${input.eventKey}, ${input.status}, ${input.source}, ${input.attemptCount}, ${input.breachCount}, ${input.httpStatusCode || null}, ${input.errorMessage || null}, ${JSON.stringify(input.metadata || null)}::jsonb)
  `
  return id
}

async function isInCooldown(eventKey: string, cooldownMinutes: number): Promise<boolean> {
  const threshold = new Date(Date.now() - cooldownMinutes * 60 * 1000)
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "SecurityNotificationDelivery"
    WHERE "eventKey" = ${eventKey}
      AND status = 'sent'
      AND "createdAt" >= ${threshold}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `
  return rows.length > 0
}

async function postWithRetry(input: {
  url: string
  payload: unknown
  maxRetries: number
  timeoutMs: number
}): Promise<{ ok: true; attemptCount: number; statusCode?: number } | { ok: false; attemptCount: number; statusCode?: number; errorMessage: string }> {
  let attempt = 0
  let lastError = "unknown_error"
  let lastStatus: number | undefined
  const retries = Math.max(1, Math.trunc(input.maxRetries))
  const timeoutMs = Math.max(1000, Math.trunc(input.timeoutMs))

  while (attempt < retries) {
    attempt += 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(input.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.payload),
        signal: controller.signal,
      })
      lastStatus = response.status
      if (response.ok) {
        clearTimeout(timer)
        return { ok: true, attemptCount: attempt, statusCode: response.status }
      }
      lastError = `http_${response.status}`
    } catch (error: any) {
      lastError = error?.name === "AbortError" ? "timeout" : String(error?.message || error)
    } finally {
      clearTimeout(timer)
    }

    if (attempt < retries) {
      const backoffMs = Math.min(1500 * 2 ** (attempt - 1), 8000)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  return { ok: false, attemptCount: attempt, statusCode: lastStatus, errorMessage: lastError }
}

export async function listNotificationDeliveries(limit = 50): Promise<
  Array<{
    id: string
    channel: string
    eventKey: string
    status: string
    source: string
    attemptCount: number
    breachCount: number
    httpStatusCode: number | null
    errorMessage: string | null
    createdAt: string
  }>
> {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)))
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      channel: string
      eventKey: string
      status: string
      source: string
      attemptCount: number
      breachCount: number
      httpStatusCode: number | null
      errorMessage: string | null
      createdAt: Date
    }>
  >`
    SELECT id, channel, "eventKey", status, source, "attemptCount", "breachCount", "httpStatusCode", "errorMessage", "createdAt"
    FROM "SecurityNotificationDelivery"
    ORDER BY "createdAt" DESC
    LIMIT ${safeLimit}
  `
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function sendSlaBreachNotificationNow(options?: {
  source?: "manual" | "scheduled"
  force?: boolean
}): Promise<SlaNotificationResult> {
  const webhookUrl = getWebhookUrl()
  const minRequired = envInt("SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT", 1)
  const cooldownMinutes = envInt("SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES", 30)
  const maxRetries = envInt("SECURITY_INCIDENT_NOTIFY_MAX_RETRIES", 3)
  const timeoutMs = envInt("SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS", 5000)
  const source = options?.source || "manual"
  const force = options?.force || envBool("SECURITY_INCIDENT_NOTIFY_FORCE", false)

  const result = await listSecurityIncidents({
    limit: 500,
    offset: 0,
    status: "all",
    slaBreached: true,
  })
  const breachCount = result.incidents.length

  if (!webhookUrl) {
    const deliveryId = await recordDelivery({
      channel: "webhook",
      eventKey: "security_incident_sla_breach",
      status: "skipped",
      source,
      attemptCount: 0,
      breachCount,
      errorMessage: "webhook_not_configured",
    })
    return {
      enabled: false,
      sent: false,
      breachCount,
      minRequired,
      source,
      deliveryId,
      reason: "webhook_not_configured",
    }
  }

  if (breachCount < minRequired) {
    const deliveryId = await recordDelivery({
      channel: "webhook",
      eventKey: "security_incident_sla_breach",
      status: "skipped",
      source,
      attemptCount: 0,
      breachCount,
      errorMessage: "below_threshold",
    })
    return {
      enabled: true,
      sent: false,
      breachCount,
      minRequired,
      source,
      deliveryId,
      reason: "below_threshold",
    }
  }

  if (!force) {
    const inCooldown = await isInCooldown("security_incident_sla_breach", cooldownMinutes)
    if (inCooldown) {
      const deliveryId = await recordDelivery({
        channel: "webhook",
        eventKey: "security_incident_sla_breach",
        status: "skipped",
        source,
        attemptCount: 0,
        breachCount,
        errorMessage: "cooldown",
      })
      return {
        enabled: true,
        sent: false,
        breachCount,
        minRequired,
        source,
        skippedByCooldown: true,
        cooldownMinutes,
        deliveryId,
        reason: "cooldown",
      }
    }
  }

  const top = result.incidents.slice(0, 10).map((incident) => ({
    id: incident.id,
    severity: incident.severity,
    status: incident.status,
    action: incident.action,
    ageMinutes: incident.ageMinutes,
    slaTargetMinutes: incident.slaTargetMinutes,
    priority: incident.priority,
    ipAddress: incident.ipAddress,
    userEmail: incident.userEmail,
    details: incident.details || incident.title,
  }))

  const payload = {
    event: "security_incident_sla_breach",
    generatedAt: new Date().toISOString(),
    breachCount,
    minRequired,
    stats: result.stats,
    topIncidents: top,
  }

  const delivery = await postWithRetry({
    url: webhookUrl,
    payload,
    maxRetries,
    timeoutMs,
  })

  if (!delivery.ok) {
    const deliveryId = await recordDelivery({
      channel: "webhook",
      eventKey: "security_incident_sla_breach",
      status: "failed",
      source,
      attemptCount: delivery.attemptCount,
      breachCount,
      httpStatusCode: delivery.statusCode,
      errorMessage: delivery.errorMessage,
      metadata: {
        minRequired,
        cooldownMinutes,
      },
    })
    return {
      enabled: true,
      sent: false,
      breachCount,
      minRequired,
      source,
      attemptCount: delivery.attemptCount,
      deliveryId,
      reason: delivery.errorMessage,
    }
  }

  const deliveryId = await recordDelivery({
    channel: "webhook",
    eventKey: "security_incident_sla_breach",
    status: "sent",
    source,
    attemptCount: delivery.attemptCount,
    breachCount,
    httpStatusCode: delivery.statusCode,
    metadata: {
      minRequired,
      cooldownMinutes,
    },
  })

  return {
    enabled: true,
    sent: true,
    breachCount,
    minRequired,
    source,
    cooldownMinutes,
    attemptCount: delivery.attemptCount,
    deliveryId,
  }
}
