import { expect, test } from "@playwright/test"
import { loginAsDefaultUser } from "./helpers/auth"

test("login with default E2E user reaches dashboard", async ({ page }) => {
  await loginAsDefaultUser(page)

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("Centro De Operaciones")).toBeVisible()
})

test("dashboard redirects anonymous user to signin", async ({ page }) => {
  await page.goto("/dashboard")

  await page.waitForURL("**/auth/signin")
  await expect(page.getByLabel("Correo Electrónico")).toBeVisible()
  await expect(page.getByLabel("Contraseña")).toBeVisible()
})
