import { expect, test } from "@playwright/test"
import { loginAsRole } from "./helpers/auth"

test.beforeEach(async ({ page }) => {
  await loginAsRole(page, "ADMIN")
})

test("admin can open and confirm delete dialog for guias", async ({ page }) => {
  await page.route("**/api/dashboard/guias-valija/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
      return
    }

    await route.continue()
  })

  await page.goto("/dashboard/guias-valija")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija$/)

  const deleteButtons = page.locator('button[aria-label^="Eliminar guía "]:visible')
  const count = await deleteButtons.count()

  test.skip(count === 0, "No hay guías disponibles para probar eliminación")

  await deleteButtons.first().click()
  await expect(page.getByRole("heading", { name: /Eliminar Guía/i })).toBeVisible()
  await page.getByRole("button", { name: /^Eliminar$/ }).last().click()
  await expect(page.getByText(/Guía eliminada correctamente/i)).toBeVisible()
})

test("admin can open and confirm delete dialog for hojas", async ({ page }) => {
  await page.route("**/api/hojas-remision/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
      return
    }

    await route.continue()
  })

  await page.goto("/dashboard/hojas-remision")
  await expect(page).toHaveURL(/\/dashboard\/hojas-remision$/)

  const deleteButtons = page.locator('button[title="Eliminar"]:visible')
  const count = await deleteButtons.count()

  test.skip(count === 0, "No hay hojas disponibles para probar eliminación")

  await deleteButtons.first().click()
  await expect(page.getByRole("heading", { name: /Eliminar Hoja de Remisión/i })).toBeVisible()
  await page.getByRole("button", { name: /^Eliminar$/ }).last().click()
  await expect(page.getByText(/Hoja de Remisión eliminada correctamente/i)).toBeVisible()
})
