import { expect, test } from "@playwright/test"
import { loginAsDefaultUser } from "./helpers/auth"

test.beforeEach(async ({ page }) => {
  await loginAsDefaultUser(page)
})

test("guias and hojas routes load after login", async ({ page }) => {
  await page.goto("/dashboard/guias-valija")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija$/)
  await expect(page.getByText(/Lista de guías de valija registradas/i)).toBeVisible()

  await page.goto("/dashboard/hojas-remision")
  await expect(page).toHaveURL(/\/dashboard\/hojas-remision$/)
  await expect(page.getByRole("heading", { name: "Hojas de Remisión" })).toBeVisible()
})

test("documents pending route loads after login", async ({ page }) => {
  await page.goto("/dashboard/documents?rStatus=pending")

  await expect(page).toHaveURL(/\/dashboard\/documents\?rStatus=pending/)
  await expect(page.getByText(/Sube un documento para extraer texto/i)).toBeVisible()
})
