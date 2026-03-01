import { describe, expect, it } from "vitest"
import { shouldTrackView, withTrackView } from "./utils"

describe("withTrackView", () => {
  it("adds trackView when url has no query", () => {
    expect(withTrackView("/api/oficios/of-1", false)).toBe("/api/oficios/of-1?trackView=0")
  })

  it("preserves existing query params", () => {
    expect(withTrackView("/api/oficios/of-1?foo=bar", false)).toBe("/api/oficios/of-1?foo=bar&trackView=0")
  })

  it("overwrites existing trackView", () => {
    expect(withTrackView("/api/oficios/of-1?trackView=1&foo=bar", false)).toBe("/api/oficios/of-1?trackView=0&foo=bar")
  })
})

describe("shouldTrackView", () => {
  it("returns true by default when param is missing", () => {
    expect(shouldTrackView("/api/oficios/of-1")).toBe(true)
  })

  it("returns true when trackView=1", () => {
    expect(shouldTrackView("/api/oficios/of-1?trackView=1")).toBe(true)
  })

  it("returns false when trackView=0", () => {
    expect(shouldTrackView("/api/oficios/of-1?foo=bar&trackView=0")).toBe(false)
  })
})
