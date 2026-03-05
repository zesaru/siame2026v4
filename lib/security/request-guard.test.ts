import { afterEach, describe, expect, it } from "vitest"
import { assertTrustedMutationHost, isTrustedMutationOrigin } from "./request-guard"

describe("request-guard", () => {
  const oldHosts = process.env.SECURITY_TRUSTED_HOSTS

  afterEach(() => {
    process.env.SECURITY_TRUSTED_HOSTS = oldHosts
  })

  it("accepts matching origin host", () => {
    const result = isTrustedMutationOrigin({
      requestHost: "localhost:3001",
      originHeader: "http://localhost:3001",
    })
    expect(result).toBe(true)
  })

  it("accepts matching referer host when origin is missing", () => {
    const result = isTrustedMutationOrigin({
      requestHost: "siame.example.com",
      refererHeader: "https://siame.example.com/dashboard/audit-logs",
    })
    expect(result).toBe(true)
  })

  it("rejects foreign origin host", () => {
    const result = isTrustedMutationOrigin({
      requestHost: "siame.example.com",
      originHeader: "https://evil.example.net",
      refererHeader: "https://evil.example.net/pwn",
    })
    expect(result).toBe(false)
  })

  it("rejects request host outside trusted allowlist", () => {
    process.env.SECURITY_TRUSTED_HOSTS = "siame.example.com"
    expect(() => assertTrustedMutationHost("evil.example.com")).toThrow("Untrusted request host")
  })

  it("accepts request host in trusted allowlist", () => {
    process.env.SECURITY_TRUSTED_HOSTS = "siame.example.com,localhost:3001"
    expect(() => assertTrustedMutationHost("localhost:3001")).not.toThrow()
  })
})
