import { beforeEach, describe, expect, it, vi } from "vitest"

const listSecurityIncidentsMock = vi.fn()
const prismaMock = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

vi.mock("./security-incidents", () => ({
  listSecurityIncidents: listSecurityIncidentsMock,
}))
vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("security-notifications", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL
    delete process.env.SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT
    delete process.env.SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES
    delete process.env.SECURITY_INCIDENT_NOTIFY_MAX_RETRIES
    delete process.env.SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS
  })

  it("returns disabled when webhook is not configured", async () => {
    listSecurityIncidentsMock.mockResolvedValue({
      incidents: [],
      total: 0,
      stats: { open: 0, ack: 0, resolved: 0, openSlaBreached: 0 },
    })
    const { sendSlaBreachNotificationNow } = await import("./security-notifications")

    prismaMock.$executeRaw.mockResolvedValue(1)
    const result = await sendSlaBreachNotificationNow()
    expect(result.enabled).toBe(false)
    expect(result.sent).toBe(false)
  })

  it("sends webhook when breaches meet threshold", async () => {
    process.env.SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL = "https://example.com/webhook"
    process.env.SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT = "1"

    listSecurityIncidentsMock.mockResolvedValue({
      incidents: [
        {
          id: "inc-1",
          severity: "high",
          status: "open",
          action: "LOGIN_BLOCKED",
          ageMinutes: 40,
          slaTargetMinutes: 30,
          priority: 450,
          ipAddress: "1.1.1.1",
          userEmail: "a@b.com",
          details: "ip_quarantine",
          title: "x",
        },
      ],
      total: 1,
      stats: { open: 1, ack: 0, resolved: 0, openSlaBreached: 1 },
    })

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)
    prismaMock.$queryRaw.mockResolvedValueOnce([]) // no cooldown hit
    prismaMock.$executeRaw.mockResolvedValue(1)

    const { sendSlaBreachNotificationNow } = await import("./security-notifications")
    const result = await sendSlaBreachNotificationNow()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.sent).toBe(true)
  })

  it("skips sending when cooldown is active", async () => {
    process.env.SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL = "https://example.com/webhook"
    process.env.SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT = "1"

    listSecurityIncidentsMock.mockResolvedValue({
      incidents: [
        {
          id: "inc-1",
          severity: "high",
          status: "open",
          action: "LOGIN_BLOCKED",
          ageMinutes: 40,
          slaTargetMinutes: 30,
          priority: 450,
          ipAddress: "1.1.1.1",
          userEmail: "a@b.com",
          details: "ip_quarantine",
          title: "x",
        },
      ],
      total: 1,
      stats: { open: 1, ack: 0, resolved: 0, openSlaBreached: 1 },
    })

    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "delivery-1" }]) // cooldown hit
    prismaMock.$executeRaw.mockResolvedValue(1)
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { sendSlaBreachNotificationNow } = await import("./security-notifications")
    const result = await sendSlaBreachNotificationNow()

    expect(result.sent).toBe(false)
    expect(result.reason).toBe("cooldown")
    expect(fetchMock).toHaveBeenCalledTimes(0)
  })
})
