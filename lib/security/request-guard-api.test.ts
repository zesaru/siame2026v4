import { afterEach, describe, expect, it } from "vitest"
import type { NextApiRequest } from "next"
import { assertTrustedApiMutationRequest } from "./request-guard-api"

function makeReq(headers: Record<string, string | undefined>): NextApiRequest {
  return {
    headers,
  } as unknown as NextApiRequest
}

describe("request-guard-api", () => {
  const oldNodeEnv = process.env.NODE_ENV
  const oldAllow = process.env.SECURITY_ALLOW_MISSING_ORIGIN
  const oldHosts = process.env.SECURITY_TRUSTED_HOSTS

  afterEach(() => {
    process.env.NODE_ENV = oldNodeEnv
    process.env.SECURITY_ALLOW_MISSING_ORIGIN = oldAllow
    process.env.SECURITY_TRUSTED_HOSTS = oldHosts
  })

  it("allows matching origin and host", () => {
    process.env.SECURITY_TRUSTED_HOSTS = ""
    const req = makeReq({
      host: "localhost:3001",
      origin: "http://localhost:3001",
    })
    expect(() => assertTrustedApiMutationRequest(req)).not.toThrow()
  })

  it("blocks mismatched origin", () => {
    process.env.SECURITY_TRUSTED_HOSTS = ""
    const req = makeReq({
      host: "localhost:3001",
      origin: "http://evil.local",
    })
    expect(() => assertTrustedApiMutationRequest(req)).toThrow("Invalid request origin")
  })

  it("blocks host not present in trusted allowlist", () => {
    process.env.SECURITY_TRUSTED_HOSTS = "app.example.com"
    const req = makeReq({
      host: "localhost:3001",
      origin: "http://localhost:3001",
    })
    expect(() => assertTrustedApiMutationRequest(req)).toThrow("Untrusted request host")
  })

  it("allows missing origin in dev when explicit bypass is enabled", () => {
    process.env.NODE_ENV = "development"
    process.env.SECURITY_ALLOW_MISSING_ORIGIN = "true"
    process.env.SECURITY_TRUSTED_HOSTS = ""

    const req = makeReq({
      host: "localhost:3001",
    })
    expect(() => assertTrustedApiMutationRequest(req)).not.toThrow()
  })
})
