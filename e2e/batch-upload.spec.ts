import { expect, test } from "@playwright/test"
import path from "node:path"
import { loginAsDefaultUser } from "./helpers/auth"

const mockBatchResponse = {
  id: "mock-batch-1",
  status: "ready_review",
  totalFiles: 1,
  readyCount: 1,
  savedCount: 0,
  failedCount: 0,
  items: [
    {
      id: "mock-item-1",
      fileName: "sample.pdf",
      filePath: null,
      analysisStatus: "ready_review",
      errorMessage: null,
      guiaValijaId: null,
      sortOrder: 0,
      analysisResult: {
        content: "GUIA DE VALIJA DIPLOMATICA N° 20",
        tables: [],
        keyValuePairs: [
          { key: "PARA", value: "LEPRU TOKIO", confidence: 0.99 },
          { key: "N° DE GUÍA", value: "20", confidence: 0.98 },
          { key: "FECHA DE ENVÍO", value: "17/10/2025", confidence: 0.98 },
          { key: "FECHA DE RECIBO", value: "21/10/2025", confidence: 0.97 },
          { key: "TOTAL DE ITEMS", value: "4", confidence: 0.96 },
          { key: "PESO OFICIAL", value: "11.500", confidence: 0.95 },
        ],
        metadata: { pageCount: 1, languages: ["es"] },
        documentId: "mock-document-1",
      },
    },
  ],
}

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

test("batch upload renders review queue after mocked batch creation", async ({ page }) => {
  await loginAsDefaultUser(page)

  await page.route("**/api/guias-valija/batches", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(mockBatchResponse),
      })
      return
    }

    await route.continue()
  })

  await page.route("**/api/guias-valija/batches/mock-batch-1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockBatchResponse),
    })
  })

  await page.goto("/dashboard/guias-valija/lote")
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(path.resolve("e2e/fixtures/sample.pdf"))
  await page.getByRole("button", { name: /Crear lote \(1\)/i }).click()

  await expect(page).toHaveURL(/batchId=mock-batch-1/)
  await expect(page.getByRole("heading", { name: /Cola de revisión/i })).toBeVisible()
  await expect(page.getByText("sample.pdf").first()).toBeVisible()
  await expect(page.getByText(/Item activo/i)).toBeVisible()
  await expect(page.getByRole("button", { name: /Guardar y continuar/i })).toBeVisible()
})
