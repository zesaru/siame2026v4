import { expect, test } from "@playwright/test"
import { loginAsRole } from "./helpers/auth"

async function fetchJson<T>(page: import("@playwright/test").Page, path: string): Promise<T> {
  return await page.evaluate(async (target) => {
    const response = await fetch(target, { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`request_failed:${response.status}`)
    }
    return await response.json()
  }, path)
}

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

test("admin can open and confirm delete flow for items", async ({ page }) => {
  await page.route("**/api/guias-valija-items/*", async (route) => {
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

  await page.goto("/dashboard/guias-valija-items")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija-items$/)

  const deleteButtons = page.locator('button[title="Eliminar item"]:visible')
  const count = await deleteButtons.count()

  test.skip(count === 0, "No hay items disponibles para probar eliminación")

  await deleteButtons.first().click()
  await expect(page.getByText(/Item eliminado correctamente/i)).toBeVisible()
})

test("admin can open and confirm delete flow for oficios", async ({ page }) => {
  const response = await fetchJson<{ data: Array<{ id: string }> }>(page, "/api/oficios?limit=1")
  const oficios = response.data ?? []
  test.skip(oficios.length === 0, "No hay oficios disponibles para probar eliminación")

  const oficioId = oficios[0].id

  await page.route(`**/api/oficios/${oficioId}`, async (route) => {
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

  await page.goto(`/dashboard/oficios/${oficioId}/edit`, { waitUntil: "domcontentloaded" })
  await expect(page.getByText(/Editar Oficio|Cargando oficio|Nº Oficio/i).first()).toBeVisible()
  await page.getByRole("button", { name: /^Eliminar$/i }).click()
  await expect(page.getByRole("heading", { name: /Eliminar oficio/i })).toBeVisible()
  await page.getByRole("button", { name: /Confirmar eliminación/i }).click()
  await expect(page.getByText(/Oficio eliminado/i)).toBeVisible()
})
