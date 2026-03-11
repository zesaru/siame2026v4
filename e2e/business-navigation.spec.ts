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

test("guias detail api and edit page load for an existing record when available", async ({ page }) => {
  await page.goto("/dashboard/guias-valija")
  await expect(page).toHaveURL(/\/dashboard\/guias-valija$/)
  await expect(page.getByText(/Lista de guías de valija registradas/i)).toBeVisible()

  const guias = await fetchJson<Array<{ id: string }>>(page, "/api/dashboard/guias-valija")

  if (guias.length === 0) {
    await expect(page.getByText(/No hay guías de valija/i)).toBeVisible()
    return
  }

  const guiaId = guias[0].id
  await page.goto(`/dashboard/guias-valija/${guiaId}/edit`, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(new RegExp(`/dashboard/guias-valija/${guiaId}/edit$`))
  await expect(page.getByText(/Editar:|Guía no disponible|Guía no encontrada|Cargando formulario de edición/i).first()).toBeVisible()
})

test("hojas view and edit pages load for an existing record when available", async ({ page }) => {
  await page.goto("/dashboard/hojas-remision")
  await expect(page).toHaveURL(/\/dashboard\/hojas-remision$/)
  await expect(page.getByRole("heading", { name: "Hojas de Remisión" })).toBeVisible()

  const response = await fetchJson<{ hojas: Array<{ id: string }> }>(page, "/api/hojas-remision")
  const hojas = response.hojas ?? []

  if (hojas.length === 0) {
    await expect(page.getByText(/Sin hojas registradas/i)).toBeVisible()
    return
  }

  const hojaId = hojas[0].id

  await page.goto(`/dashboard/hojas-remision/${hojaId}/view`, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(new RegExp(`/dashboard/hojas-remision/${hojaId}/view$`))
  await expect(page.getByText(/Hoja de Remision|Hoja de remision no encontrada|Volver|PDF no disponible/i).first()).toBeVisible()

  await page.goto(`/dashboard/hojas-remision/edit/${hojaId}`, { waitUntil: "domcontentloaded" })
  await expect(page).toHaveURL(new RegExp(`/dashboard/hojas-remision/edit/${hojaId}$`))
  await expect(page.getByText(/Editar Hoja|Hoja de remision no encontrada|Documento PDF de la hoja|Cargando hoja de remision/i).first()).toBeVisible()
})
