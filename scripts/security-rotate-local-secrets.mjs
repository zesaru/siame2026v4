#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fileIdx = args.indexOf('--file')
const envFile = fileIdx >= 0 && args[fileIdx + 1] ? args[fileIdx + 1] : '.env'

function randomBase64(bytes) {
  return crypto.randomBytes(bytes).toString('base64url')
}

function randomPassword(len = 24) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function upsertEnv(text, key, value) {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(text)) return text.replace(re, line)
  return `${text.trimEnd()}\n${line}\n`
}

const abs = path.resolve(process.cwd(), envFile)
if (!fs.existsSync(abs)) {
  console.error(`[security:rotate] No existe ${abs}`)
  process.exit(1)
}

const nextAuthSecret = randomBase64(48)
const superAdminPassword = randomPassword(28)

let raw = fs.readFileSync(abs, 'utf8')
raw = upsertEnv(raw, 'NEXTAUTH_SECRET', `"${nextAuthSecret}"`)
raw = upsertEnv(raw, 'SUPER_ADMIN_PASSWORD', superAdminPassword)

if (dryRun) {
  console.log(`[security:rotate] Dry run sobre ${abs}`)
  console.log(`[security:rotate] NEXTAUTH_SECRET => ${nextAuthSecret.slice(0, 6)}...`)
  console.log(`[security:rotate] SUPER_ADMIN_PASSWORD => ${superAdminPassword.slice(0, 4)}...`)
  process.exit(0)
}

fs.writeFileSync(abs, raw, 'utf8')
console.log(`[security:rotate] Secretos locales rotados en ${abs}`)
console.log(`[security:rotate] IMPORTANTE: guarda el nuevo SUPER_ADMIN_PASSWORD en un gestor seguro.`)
