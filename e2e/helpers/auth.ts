import { expect, type Page } from "@playwright/test"

const E2E_EMAIL = process.env.E2E_USER_EMAIL || "admin@siame.com"
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD || "temp123"

export async function loginAsDefaultUser(page: Page) {
  await page.goto("/auth/signin")

  await expect(page.getByLabel("Correo Electrónico")).toBeVisible()
  await expect(page.getByLabel("Contraseña")).toBeVisible()
  await page.getByLabel("Correo Electrónico").fill(E2E_EMAIL)
  await page.getByLabel("Contraseña").fill(E2E_PASSWORD)
  await page.getByRole("button", { name: /Iniciar Sesión/i }).click()
  await page.waitForURL("**/dashboard")
}
