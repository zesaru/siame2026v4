import { expect, test, type Page } from "@playwright/test"
import { loginAsRole } from "./helpers/auth"

type GuiaListItem = {
  id: string
  numeroGuia: string
}

type HojaListItem = {
  id: string
  numeroCompleto: string
}

async function fetchJson<T>(page: Page, path: string, options?: RequestInit): Promise<T> {
  return await page.evaluate(async ({ target, init }) => {
    const response = await fetch(target, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    })

    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    if (!response.ok) {
      throw new Error(`request_failed:${response.status}:${data?.error || "unknown"}`)
    }

    return data
  }, { target: path, init: options })
}

async function cleanupGuia(page: Page, id: string) {
  await page.evaluate(async (target) => {
    await fetch(target, { method: "DELETE" })
  }, `/api/guias-valija/${id}`)
}

async function cleanupHoja(page: Page, id: string) {
  await page.evaluate(async (target) => {
    await fetch(target, { method: "DELETE" })
  }, `/api/hojas-remision/${id}`)
}

test.beforeEach(async ({ page }) => {
  await loginAsRole(page, "ADMIN")
})

test("hoja de remision can be created through real UI flow", async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)
  const numeroCompleto = `HR N°99-TEST/${suffix}`
  const asunto = `ASUNTO E2E ${suffix}`
  let createdHojaId: string | null = null

  try {
    await page.goto("/dashboard/hojas-remision/new")
    await expect(page.getByRole("heading", { name: /Nueva Hoja de Remision/i })).toBeVisible()

    await page.getByLabel(/Número Completo/i).fill(numeroCompleto)
    await page.getByLabel(/Sigla Unidad/i).fill("TST")
    await page.locator("#fecha").fill("2026-03-11")
    await page.getByLabel(/Para \(Destinatario\)/i).fill("DESTINATARIO E2E")
    await page.getByLabel(/^Remitente/i).fill("REMITENTE E2E")
    await page.getByLabel(/^Documento/i).fill("DOCUMENTO E2E")
    await page.locator(".ProseMirror").first().fill(asunto)
    await page.getByLabel(/^Destino/i).fill("TOKIO, JAPÓN")
    await page.getByLabel(/^Referencia/i).fill(`REF-${suffix}`)
    await page.getByLabel(/Peso \(kg\)/i).fill("1.250")

    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/dashboard\/hojas-remision$/, { timeout: 20000 })
    await expect(page.getByText(numeroCompleto).first()).toBeVisible()

    const response = await fetchJson<{ hojas: HojaListItem[] }>(
      page,
      `/api/hojas-remision?search=${encodeURIComponent(numeroCompleto)}&limit=5`
    )
    const created = (response.hojas ?? []).find((item) => item.numeroCompleto === numeroCompleto)
    expect(created).toBeTruthy()
    createdHojaId = created?.id ?? null
  } finally {
    if (createdHojaId) {
      await cleanupHoja(page, createdHojaId)
    }
  }
})

test("guia de valija can be created through real backend processing", async ({ page }) => {
  const suffix = Math.floor(100 + Math.random() * 900).toString()
  const numeroBase = `9${suffix}`
  const numeroGuia = `${numeroBase}-2026`
  let createdGuiaId: string | null = null

  const azureResult = {
    content: `GUÍA DE VALIJA DIPLOMÁTICA N°${numeroBase}. PARA: LEPRU TOKIO`,
    keyValuePairs: [
      { key: "PARA", value: "LEPRU TOKIO", confidence: 0.99 },
      { key: "DE", value: "UNIDAD DE VALIJA DIPLOMÁTICA", confidence: 0.99 },
      { key: "FECHA DE ENVIO", value: "11/03/2026", confidence: 0.99 },
      { key: "FECHA DE RECIBO", value: "12/03/2026", confidence: 0.98 },
      { key: "Total de Items", value: "1", confidence: 0.97 },
      { key: "Peso Total", value: "1.250", confidence: 0.96 },
      { key: "Peso Oficial", value: "1.500", confidence: 0.96 },
    ],
    tables: [],
    metadata: { pageCount: 1, languages: ["es"] },
  }

  try {
    const result = await fetchJson<{ guia: { id: string; numeroGuia: string } }>(page, "/api/guias-valija/procesar", {
      method: "POST",
      body: JSON.stringify({
        azureResult,
        fileName: `E2E GUIA ${numeroBase}.pdf`,
      }),
    })

    createdGuiaId = result.guia.id
    expect(result.guia.numeroGuia).toBe(numeroGuia)

    const guias = await fetchJson<GuiaListItem[]>(page, "/api/dashboard/guias-valija")
    expect(guias.some((item) => item.id === createdGuiaId && item.numeroGuia === numeroGuia)).toBe(true)

    await page.goto("/dashboard/guias-valija")
    await expect(page.getByRole("table", { name: /Lista de guías de valija registradas/i }).getByRole("cell", { name: numeroGuia, exact: true }).first()).toBeVisible()
  } finally {
    if (createdGuiaId) {
      await cleanupGuia(page, createdGuiaId)
    }
  }
})
