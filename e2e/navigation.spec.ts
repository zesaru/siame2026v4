import { expect, test } from "@playwright/test"
import { loginAsDefaultUser } from "./helpers/auth"

test.beforeEach(async ({ page }) => {
  await loginAsDefaultUser(page)
})

test("dashboard quick links navigate to guias and hojas", async ({ page }) => {
  await page.getByRole("link", { name: /Guías de valija/i }).click()
  await expect(page).toHaveURL(/\/dashboard\/guias-valija$/)
  await expect(page.getByText(/Lista de guías de valija registradas/i)).toBeVisible()

  await page.goto("/dashboard")
  await page.getByRole("link", { name: /Hojas de remision/i }).click()
  await expect(page).toHaveURL(/\/dashboard\/hojas-remision$/)
  await expect(page.getByText(/Hojas de Remision/i)).toBeVisible()
})

test("documents pending route loads after login", async ({ page }) => {
  await page.goto("/dashboard/documents?rStatus=pending")

  await expect(page).toHaveURL(/\/dashboard\/documents\?rStatus=pending/)
  await expect(page.getByText(/Sube un documento para extraer texto/i)).toBeVisible()
})
