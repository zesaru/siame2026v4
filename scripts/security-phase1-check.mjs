#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BLOCKED_PATTERNS = [
  { regex: /NEXTAUTH_SECRET\s*=\s*["']?your-secret-key-change-this-in-production["']?/i, message: 'NEXTAUTH_SECRET inseguro (valor por defecto)' },
  { regex: /SUPER_ADMIN_PASSWORD\s*=\s*ChangeMe123!/i, message: 'SUPER_ADMIN_PASSWORD inseguro (valor por defecto)' },
  { regex: /AZURE_FORM_RECOGNIZER_KEY\s*=\s*[A-Za-z0-9]{20,}/, message: 'Posible Azure key hardcodeada' },
]

const IGNORED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
])

function gitLsFiles() {
  const out = execSync('git ls-files', { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8')
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

function isLikelyTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const textExt = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.env', '.txt', '.sql', '.ps1', '.sh', '.bat', '.toml', '.conf', '.ini'
  ])
  if (textExt.has(ext)) return true
  const base = path.basename(filePath)
  if (base.startsWith('.env')) return true
  return false
}

function checkTrackedEnvFiles(files) {
  const trackedEnv = files.filter((f) => path.basename(f).startsWith('.env') && path.basename(f) !== '.env.production.example')
  return trackedEnv.map((f) => ({ file: f, message: 'Archivo .env versionado en git (riesgo de secretos)' }))
}

function scanPatterns(files) {
  const findings = []

  for (const file of files) {
    if (!isLikelyTextFile(file)) continue

    const base = path.basename(file)
    if (IGNORED_FILES.has(base)) continue

    let content = ''
    try {
      content = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.regex.test(content)) {
        findings.push({ file, message: pattern.message })
      }
    }
  }

  return findings
}

function main() {
  const files = gitLsFiles()
  const findings = [
    ...checkTrackedEnvFiles(files),
    ...scanPatterns(files),
  ]

  if (findings.length === 0) {
    console.log('✅ Security Phase 1 baseline OK')
    process.exit(0)
  }

  console.error('❌ Security Phase 1 findings:')
  for (const f of findings) {
    console.error(`- ${f.file}: ${f.message}`)
  }
  process.exit(1)
}

main()
