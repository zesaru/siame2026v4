import type { NextApiRequest } from "next"
import { assertTrustedMutationHost, isTrustedMutationOrigin } from "./request-guard"

export function assertTrustedApiMutationRequest(req: NextApiRequest): void {
  const requestHost = (req.headers["x-forwarded-host"] || req.headers.host || null) as string | null
  const originHeader = (req.headers.origin || null) as string | null
  const refererHeader = (req.headers.referer || null) as string | null

  assertTrustedMutationHost(requestHost)

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.SECURITY_ALLOW_MISSING_ORIGIN === "true" &&
    !originHeader &&
    !refererHeader
  ) {
    return
  }

  const trusted = isTrustedMutationOrigin({
    requestHost,
    originHeader,
    refererHeader,
  })

  if (!trusted) {
    throw new Error("Invalid request origin")
  }
}
