import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import AuditLogsClient from "./audit-logs-client"

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe("AuditLogsClient", () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView

  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterAll(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders normalized labels for UPDATE action and OFICIO type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        logs: [
          {
            id: "log-1",
            userId: "u1",
            filePath: "OFICIO/of-1",
            action: "UPDATE",
            ipAddress: "127.0.0.1",
            userAgent: "vitest",
            documentType: "OFICIO",
            documentId: "of-1",
            documentTitle: "OF-100",
            timestamp: new Date().toISOString(),
            user: {
              name: "User Test",
              email: "user@test.com",
              role: "SUPER_ADMIN",
            },
          },
        ],
      }),
    })

    vi.stubGlobal("fetch", fetchMock)
    render(<AuditLogsClient />)

    await waitFor(() => {
      expect(screen.getByText("Actualizar")).toBeInTheDocument()
      expect(screen.getByText("Oficio")).toBeInTheDocument()
    })
  })

})
