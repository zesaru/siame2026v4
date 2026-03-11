import { expect, test } from "@playwright/test"
import { loginAsDefaultUser } from "./helpers/auth"

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
  await loginAsDefaultUser(page)
})

test("items de valija list and edit page load when records exist", async ({ page }) => {
  await page.goto("/dashboard/guias-valija-items")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija-items$/)
  await expect(page.getByText(/Items de Guía de Valija/i)).toBeVisible()

  const response = await fetchJson<{ items: Array<{ id: string }> }>(page, "/api/guias-valija-items?limit=1")
  const items = response.items ?? []

  if (items.length === 0) {
    await expect(page.getByText(/No hay resultados|Aún no hay items registrados/i).first()).toBeVisible()
    return
  }

  const itemId = items[0].id
  await page.goto(`/dashboard/guias-valija-items/${itemId}/edit`, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(new RegExp(`/dashboard/guias-valija-items/${itemId}/edit$`))
  await expect(page.getByText(/Editar Item #|Datos del Item|Item no encontrado|Cargando/i).first()).toBeVisible()
})

test("oficios list, view and edit pages load when records exist", async ({ page }) => {
  await page.goto("/dashboard/oficios")
  await expect(page).toHaveURL(/\/dashboard\/oficios/)
  await expect(page.getByPlaceholder("Buscar por número, asunto, remitente o destinatario")).toBeVisible()

  const response = await fetchJson<{ data: Array<{ id: string }> }>(page, "/api/oficios?limit=1")
  const oficios = response.data ?? []

  if (oficios.length === 0) {
    await expect(page.getByText(/Sin resultados|No hay oficios/i).first()).toBeVisible()
    return
  }

  const oficioId = oficios[0].id

  await page.goto(`/dashboard/oficios/${oficioId}/view`, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(new RegExp(`/dashboard/oficios/${oficioId}/view$`))
  await expect(page.getByText(/Oficio Confirmado|Oficio no encontrado/i).first()).toBeVisible()

  await page.goto(`/dashboard/oficios/${oficioId}/edit`, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(new RegExp(`/dashboard/oficios/${oficioId}/edit$`))
  await expect(page.getByText(/Editar Oficio|Cargando oficio|Nº Oficio/i).first()).toBeVisible()
})
