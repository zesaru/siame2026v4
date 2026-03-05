#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const fileArgIndex = args.indexOf('--file')
const envFile = fileArgIndex >= 0 && args[fileArgIndex + 1] ? args[fileArgIndex + 1] : '.env'

function getWindowsWslGatewayIp() {
  try {
    const cmd =
      "powershell.exe -NoProfile -Command '(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like \"*WSL*\" } | Select-Object -ExpandProperty IPAddress -First 1)'"
    const output = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim()
      .replace(/\r/g, '')

    if (/^\d+\.\d+\.\d+\.\d+$/.test(output)) {
      return output
    }
  } catch {}

  try {
    const resolv = fs.readFileSync('/etc/resolv.conf', 'utf8')
    const match = resolv.match(/^nameserver\s+(\d+\.\d+\.\d+\.\d+)$/m)
    if (match) return match[1]
  } catch {}

  throw new Error('No se pudo detectar la IP de Windows host para WSL')
}

function parseDatabaseUrlFromEnv(rawEnv) {
  const match = rawEnv.match(/^DATABASE_URL=(.*)$/m)
  if (!match) {
    throw new Error('No se encontró DATABASE_URL en el archivo de entorno')
  }

  const rawValue = match[1].trim()
  const unquoted = rawValue.replace(/^"|"$/g, '')
  let parsed
  try {
    parsed = new URL(unquoted)
  } catch {
    throw new Error('DATABASE_URL no tiene formato URL válido')
  }

  return { rawValue, unquoted, parsed }
}

function maskUrlForLog(url) {
  const copy = new URL(url.toString())
  if (copy.password) copy.password = '***'
  return copy.toString()
}

function main() {
  const absPath = path.resolve(process.cwd(), envFile)
  if (!fs.existsSync(absPath)) {
    throw new Error(`No existe el archivo: ${absPath}`)
  }

  const envText = fs.readFileSync(absPath, 'utf8')
  const { rawValue, parsed } = parseDatabaseUrlFromEnv(envText)
  const targetIp = getWindowsWslGatewayIp()

  const oldHost = parsed.hostname
  parsed.hostname = targetIp

  const newValue = `\"${parsed.toString()}\"`
  const nextEnvText = envText.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${newValue}`)

  console.log(`[sync-wsl-db-host] File: ${absPath}`)
  console.log(`[sync-wsl-db-host] Old host: ${oldHost}`)
  console.log(`[sync-wsl-db-host] New host: ${targetIp}`)
  console.log(`[sync-wsl-db-host] DATABASE_URL => ${maskUrlForLog(parsed)}`)

  if (isDryRun) {
    console.log('[sync-wsl-db-host] Dry run: no se escribieron cambios')
    return
  }

  if (rawValue === newValue) {
    console.log('[sync-wsl-db-host] Sin cambios: DATABASE_URL ya estaba actualizado')
    return
  }

  fs.writeFileSync(absPath, nextEnvText, 'utf8')
  console.log('[sync-wsl-db-host] Archivo actualizado correctamente')
}

try {
  main()
} catch (error) {
  console.error(`[sync-wsl-db-host] ERROR: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
