import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export type SecurityIncidentSeverity = "high" | "medium" | "low"

export interface SecurityIncident {
  id: string
  timestamp: string
  action: string
  severity: SecurityIncidentSeverity
  priority: number
  ageMinutes: number
  slaTargetMinutes: number
  slaBreached: boolean
  status: "open" | "ack" | "resolved"
  note: string | null
  updatedAt: string | null
  ipAddress: string | null
  userEmail: string | null
  title: string
  details: string | null
}

export interface SecurityIncidentsResult {
  incidents: SecurityIncident[]
  total: number
  stats: {
    open: number
    ack: number
    resolved: number
    openSlaBreached: number
  }
}

export interface SecurityIncidentsOptions {
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
  status?: "open" | "ack" | "resolved" | "all"
  slaBreached?: boolean
  slaHighMinutes?: number
  slaMediumMinutes?: number
}

function severityForAction(action: string, details: string | null): SecurityIncidentSeverity {
  if (action === "LOGIN_BLOCKED" && (details || "").includes("ip_quarantine")) return "high"
  if (action === "SIGNUP_BLOCKED" && (details || "").includes("ip_quarantine")) return "high"
  if (action === "LOGIN_FAILED") return "medium"
  if (action === "LOGIN_BLOCKED") return "medium"
  if (action === "SIGNUP_BLOCKED") return "medium"
  if (action === "PASSWORD_CHANGE_BLOCKED") return "medium"
  if (action === "PASSWORD_CHANGE_FAILED") return "medium"
  if (action === "SESSION_REVOKED_POLICY") return "medium"
  if (action === "IP_OVERRIDE_ALLOW_ADDED" || action === "IP_OVERRIDE_ALLOW_REVOKED") return "low"
  return "low"
}

function splitTitleAndDetails(documentTitle: string | null): { title: string; details: string | null } {
  const raw = (documentTitle || "").trim()
  if (!raw) return { title: "auth-event", details: null }
  const idx = raw.indexOf(" | ")
  if (idx < 0) return { title: raw, details: null }
  return {
    title: raw.slice(0, idx).trim() || "auth-event",
    details: raw.slice(idx + 3).trim() || null,
  }
}

const INCIDENT_ACTIONS = [
  "LOGIN_FAILED",
  "LOGIN_BLOCKED",
  "SIGNUP_BLOCKED",
  "PASSWORD_CHANGE_FAILED",
  "PASSWORD_CHANGE_BLOCKED",
  "SESSION_REVOKED_POLICY",
  "IP_OVERRIDE_ALLOW_ADDED",
  "IP_OVERRIDE_ALLOW_REVOKED",
] as const

export async function listSecurityIncidents(
  options: SecurityIncidentsOptions = {},
): Promise<SecurityIncidentsResult> {
  const limit = Math.max(1, Math.min(options.limit || 50, 500))
  const offset = Math.max(0, options.offset || 0)
  const status = options.status && ["open", "ack", "resolved", "all"].includes(options.status)
    ? options.status
    : "all"

  const whereClauses: Prisma.Sql[] = [
    Prisma.sql`l.action IN (${Prisma.join(INCIDENT_ACTIONS)})`,
  ]
  if (options.startDate) {
    whereClauses.push(Prisma.sql`l.timestamp >= ${options.startDate}`)
  }
  if (options.endDate) {
    whereClauses.push(Prisma.sql`l.timestamp <= ${options.endDate}`)
  }
  if (status !== "all") {
    whereClauses.push(Prisma.sql`COALESCE(s.status, 'open') = ${status}`)
  }
  const whereSql = Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      timestamp: Date
      action: string
      ipAddress: string | null
      documentTitle: string | null
      userEmail: string | null
      stateStatus: string | null
      stateNote: string | null
      stateUpdatedAt: Date | null
    }>
  >(
    Prisma.sql`
      SELECT
        l.id,
        l.timestamp,
        l.action,
        l."ipAddress",
        l."documentTitle",
        u.email AS "userEmail",
        s.status AS "stateStatus",
        s.note AS "stateNote",
        s."updatedAt" AS "stateUpdatedAt"
      FROM "FileAuditLog" l
      LEFT JOIN "User" u ON u.id = l."userId"
      LEFT JOIN "SecurityIncidentState" s ON s.id = l.id
      ${whereSql}
      ORDER BY l.timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  )

  const countRows = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog" l
      LEFT JOIN "SecurityIncidentState" s ON s.id = l.id
      ${whereSql}
    `,
  )

  const incidents: SecurityIncident[] = rows.map((row) => {
    const split = splitTitleAndDetails(row.documentTitle)
    const severity = severityForAction(row.action, split.details)
    const ageMinutes = Math.max(0, Math.floor((Date.now() - row.timestamp.getTime()) / (60 * 1000)))
    const slaHighMinutes = Math.max(1, Math.trunc(options.slaHighMinutes || 30))
    const slaMediumMinutes = Math.max(1, Math.trunc(options.slaMediumMinutes || 120))
    const slaTargetMinutes = severity === "high" ? slaHighMinutes : severity === "medium" ? slaMediumMinutes : 24 * 60
    return {
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      action: row.action,
      severity,
      priority: 0,
      ageMinutes,
      slaTargetMinutes,
      slaBreached: false,
      status:
        row.stateStatus === "ack" || row.stateStatus === "resolved" || row.stateStatus === "open"
          ? row.stateStatus
          : "open",
      note: row.stateNote || null,
      updatedAt: row.stateUpdatedAt ? row.stateUpdatedAt.toISOString() : null,
      ipAddress: row.ipAddress,
      userEmail: row.userEmail,
      title: split.title,
      details: split.details,
    }
  })

  for (const incident of incidents) {
    const breached = incident.status !== "resolved" && incident.ageMinutes > incident.slaTargetMinutes
    incident.slaBreached = breached
    const severityWeight = incident.severity === "high" ? 300 : incident.severity === "medium" ? 200 : 100
    const statusWeight = incident.status === "open" ? 80 : incident.status === "ack" ? 40 : 0
    const breachWeight = breached ? 120 : 0
    incident.priority = severityWeight + statusWeight + breachWeight + Math.min(incident.ageMinutes, 180)
  }

  const sorted = [...incidents].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const open = sorted.filter((i) => i.status === "open").length
  const ack = sorted.filter((i) => i.status === "ack").length
  const resolved = sorted.filter((i) => i.status === "resolved").length
  const openSlaBreached = sorted.filter((i) => i.status !== "resolved" && i.slaBreached).length

  const filteredByBreach =
    options.slaBreached === true
      ? sorted.filter((incident) => incident.status !== "resolved" && incident.slaBreached)
      : sorted

  return {
    incidents: filteredByBreach,
    total: options.slaBreached === true ? filteredByBreach.length : Number(countRows[0]?.count || 0),
    stats: {
      open,
      ack,
      resolved,
      openSlaBreached,
    },
  }
}

export async function upsertSecurityIncidentState(input: {
  id: string
  status: "open" | "ack" | "resolved"
  note?: string
  updatedByUserId?: string
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "SecurityIncidentState" (id, status, note, "updatedByUserId", "createdAt", "updatedAt")
    VALUES (${input.id}, ${input.status}, ${input.note || null}, ${input.updatedByUserId || null}, NOW(), NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      status = EXCLUDED.status,
      note = EXCLUDED.note,
      "updatedByUserId" = EXCLUDED."updatedByUserId",
      "updatedAt" = NOW()
  `
}
