import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const requireRoleMock = vi.fn()
const getAuditLogsForAdminMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: vi.fn() }))
vi.mock("@/lib/middleware/authorization", () => ({
  requireRole: requireRoleMock,
  AuthorizationError: class AuthorizationError extends Error {},
}))
vi.mock("@/lib/services/file-audit.service", () => ({
  getAuditLogsForAdmin: getAuditLogsForAdminMock,
}))

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("passes OFICIO and UPDATE filters to service", async () => {
    requireRoleMock.mockResolvedValue(undefined)
    getAuditLogsForAdminMock.mockResolvedValue({ logs: [], total: 0 })

    const { GET } = await import("./route")
    const req = new Request(
      "http://localhost/api/admin/audit-logs?documentType=OFICIO&action=UPDATE&limit=25&offset=50"
    ) as unknown as NextRequest
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(getAuditLogsForAdminMock).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: "OFICIO",
        action: "UPDATE",
        limit: 25,
        offset: 50,
      })
    )
  })
})
