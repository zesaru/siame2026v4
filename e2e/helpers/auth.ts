import { expect, type Page } from "@playwright/test"

export type E2ERole = "USER" | "ADMIN" | "SUPER_ADMIN"

type Credentials = {
  email: string
  password: string
}

const defaultAdminCredentials: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL || process.env.E2E_USER_EMAIL || "admin@siame.com",
  password: process.env.E2E_ADMIN_PASSWORD || process.env.E2E_USER_PASSWORD || "temp123",
}

function readRoleCredentials(role: E2ERole): Credentials | null {
  if (role === "ADMIN") {
    return defaultAdminCredentials
  }

  const email = process.env[`E2E_${role}_EMAIL`]
  const password = process.env[`E2E_${role}_PASSWORD`]

  if (!email || !password) {
    return null
  }

  return { email, password }
}

export function hasRoleCredentials(role: E2ERole) {
  return readRoleCredentials(role) !== null
}

async function loginWithCredentials(page: Page, credentials: Credentials) {
  await page.goto("/auth/signin")

  await expect(page.getByLabel("Correo Electrónico")).toBeVisible()
  await expect(page.getByLabel("Contraseña")).toBeVisible()
  await page.getByLabel("Correo Electrónico").fill(credentials.email)
  await page.getByLabel("Contraseña").fill(credentials.password)
  await page.getByRole("button", { name: /Iniciar Sesión/i }).click()
  await page.waitForURL("**/dashboard")
}

export async function loginAsDefaultUser(page: Page) {
  await loginWithCredentials(page, defaultAdminCredentials)
}

export async function loginAsRole(page: Page, role: E2ERole) {
  const credentials = readRoleCredentials(role)
  if (!credentials) {
    throw new Error(`Missing E2E credentials for role ${role}`)
  }

  await loginWithCredentials(page, credentials)
}
