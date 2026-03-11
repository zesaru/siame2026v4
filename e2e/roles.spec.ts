import { expect, test } from "@playwright/test"
import { hasRoleCredentials, loginAsRole } from "./helpers/auth"

test("admin sees delete actions on guias and hojas lists", async ({ page }) => {
  await loginAsRole(page, "ADMIN")

  await page.goto("/dashboard/guias-valija")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija$/)
  const guiaRows = await page.locator("tbody tr").count()
  if (guiaRows > 0) {
    await expect(page.locator('button[aria-label^="Eliminar guía "]:visible').first()).toBeVisible()
  }

  await page.goto("/dashboard/hojas-remision")
  await expect(page).toHaveURL(/\/dashboard\/hojas-remision$/)
  const hojaRows = await page.locator("tbody tr").count()
  if (hojaRows > 0) {
    await expect(page.locator('button[title="Eliminar"]:visible').first()).toBeVisible()
  }
})

test("user cannot see delete actions and cannot access users admin page", async ({ page }) => {
  test.skip(!hasRoleCredentials("USER"), "E2E_USER_EMAIL/E2E_USER_PASSWORD no configurados")

  await loginAsRole(page, "USER")

  await page.goto("/dashboard/guias-valija")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija$/)
  await expect(page.locator('button[aria-label^="Eliminar guía "]:visible')).toHaveCount(0)

  await page.goto("/dashboard/hojas-remision")
  await expect(page).toHaveURL(/\/dashboard\/hojas-remision$/)
  await expect(page.locator('button[title="Eliminar"]:visible')).toHaveCount(0)

  await page.goto("/dashboard/usuarios")
  await page.waitForURL(/\/dashboard$/)
  await expect(page.getByText("Centro De Operaciones")).toBeVisible()
})
