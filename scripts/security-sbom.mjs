#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"

async function main() {
  const cwd = process.cwd()
  const lockPath = path.join(cwd, "package-lock.json")
  const outDir = path.join(cwd, "storage", "security")
  const outPath = path.join(outDir, "sbom.json")

  const lockRaw = await fs.readFile(lockPath, "utf8")
  const lock = JSON.parse(lockRaw)
  const packages = lock?.packages || {}

  const components = Object.entries(packages)
    .filter(([k, v]) => k && v && typeof v === "object" && typeof v.version === "string")
    .map(([k, v]) => ({
      name: v.name || k.replace(/^node_modules\//, ""),
      version: v.version,
      path: k,
      dev: Boolean(v.dev),
      resolved: v.resolved || null,
      integrity: v.integrity || null,
    }))

  const sbom = {
    bomFormat: "CycloneDX-lite",
    specVersion: "1.5-lite",
    version: 1,
    serialNumber: `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    metadata: {
      generatedAt: new Date().toISOString(),
      tool: "security-sbom.mjs",
    },
    components,
  }

  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(sbom, null, 2), "utf8")
  console.log(`[security:sbom] generated ${outPath} components=${components.length}`)
}

main().catch((error) => {
  console.error("[security:sbom] ERROR", error)
  process.exit(1)
})
