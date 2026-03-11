import { expect, test } from "@playwright/test"
import path from "node:path"
import { loginAsDefaultUser } from "./helpers/auth"

test("batch upload page loads and accepts local pdf selection", async ({ page }) => {
  await loginAsDefaultUser(page)

  await page.goto("/dashboard/guias-valija/lote")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija\/lote/)
  await expect(page.getByText(/Carga varios PDF y revisa cada guía una por una/i)).toBeVisible()

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(path.resolve("e2e/fixtures/sample.pdf"))

  await expect(page.getByText("sample.pdf")).toBeVisible()
  await expect(page.getByRole("button", { name: /Crear lote \(1\)/i })).toBeVisible()
})
