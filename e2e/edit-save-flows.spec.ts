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

const mockItemDetail = {
  id: "mock-item-1",
  numeroItem: 1,
  destinatario: "DESTINO ORIGINAL",
  contenido: "CONTENIDO ORIGINAL",
  remitente: "REMITENTE",
  cantidad: 1,
  peso: 1.25,
  guiaValija: {
    id: "mock-guia-1",
    numeroGuia: "03-2026",
  },
}

test.beforeEach(async ({ page }) => {
  await loginAsDefaultUser(page)
})

test("item edit can submit mocked save", async ({ page }) => {
  await page.route("**/api/guias-valija-items/mock-item-1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockItemDetail),
      })
      return
    }

    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockItemDetail, destinatario: "DESTINATARIO E2E" }),
      })
      return
    }

    await route.continue()
  })

  await page.goto("/dashboard/guias-valija-items/mock-item-1/edit", { waitUntil: "domcontentloaded" })
  await expect(page.getByText(/Editar Item #|Datos del Item|Cargando item/i).first()).toBeVisible()

  const destinatario = page.locator("#destinatario")
  await destinatario.fill("DESTINATARIO E2E")
  await page.getByRole("button", { name: /Guardar cambios/i }).click()

  await expect(page.getByText(/Item actualizado correctamente/i)).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard\/guias-valija-items$/)
})

test("oficio edit can submit mocked save", async ({ page }) => {
  const response = await fetchJson<{ data: Array<{ id: string }> }>(page, "/api/oficios?limit=1")
  const oficios = response.data ?? []
  test.skip(oficios.length === 0, "No hay oficios disponibles para probar edición")

  const oficioId = oficios[0].id

  await page.route(`**/api/oficios/${oficioId}`, async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, id: oficioId }),
      })
      return
    }
    await route.continue()
  })

  await page.goto(`/dashboard/oficios/${oficioId}/edit`, { waitUntil: "domcontentloaded" })
  await expect(page.getByText(/Editar Oficio|Cargando oficio|Nº Oficio/i).first()).toBeVisible()

  const asunto = page.getByLabel("Asunto")
  await asunto.fill("ASUNTO E2E")
  await page.getByRole("button", { name: /^Guardar$/i }).click()

  await expect(page.getByText(/Oficio actualizado/i)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/dashboard/oficios/${oficioId}/view$`))
})
