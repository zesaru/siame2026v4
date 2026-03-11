import { describe, expect, it } from "vitest"
import { parseHojaRemisionFromAzure } from "./hojas-remision-parser"

describe("parseHojaRemisionFromAzure", () => {
  it("extracts documento, asunto y destino desde tabla aunque la cabecera no esté en la fila 0", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISIÓN (PCU) N° 5-18-A/6",
      keyValuePairs: [
        { key: "HOJA DE REMISIÓN (PCU) Nº", value: "5-18-A/6" },
        { key: "PARA", value: "EMBAJADA DEL PERÚ EN EL JAPÓN" },
        { key: "DE LA", value: "DIRECCIÓN DE PROMOCIÓN CULTURAL" },
        { key: "FECHA", value: "Lima, 5 de Febrero del 2026" },
      ],
      tables: [
        {
          rowCount: 4,
          columnCount: 3,
          cells: [
            { rowIndex: 1, columnIndex: 0, content: "DOCUMENTO" },
            { rowIndex: 1, columnIndex: 1, content: "ASUNTO" },
            { rowIndex: 1, columnIndex: 2, content: "DESTINO" },
            { rowIndex: 2, columnIndex: 0, content: "DOS CAJAS DE CARTÓN" },
            { rowIndex: 2, columnIndex: 1, content: "En alcance al memorándum" },
            { rowIndex: 3, columnIndex: 1, content: "se hace llegar doce ejemplares" },
            { rowIndex: 2, columnIndex: 2, content: "EMBAJADA DEL PERÚ EN EL JAPÓN" },
          ],
        },
      ],
    })

    expect(result.documento).toBe("DOS CAJAS DE CARTÓN")
    expect(result.asunto).toContain("En alcance al memorándum")
    expect(result.asunto).toContain("se hace llegar doce ejemplares")
    expect(result.destino).toBe("EMBAJADA DEL PERÚ EN EL JAPÓN")
  })

  it("falls back to PARA as destino only when the table cannot provide a valid destino", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISIÓN (PCU) N° 5-18-A/6",
      keyValuePairs: [
        { key: "HOJA DE REMISIÓN (PCU) Nº", value: "5-18-A/6" },
        { key: "PARA", value: "EMBAJADA DEL PERÚ EN EL JAPÓN" },
        { key: "ASUNTO", value: "ASUNTO" },
      ],
      tables: [],
    })

    expect(result.destino).toBe("EMBAJADA DEL PERÚ EN EL JAPÓN")
  })

  it("merges compatible tables split across multiple pages", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISIÓN (PCU) N° 5-18-A/6",
      keyValuePairs: [
        { key: "HOJA DE REMISIÓN (PCU) Nº", value: "5-18-A/6" },
        { key: "PARA", value: "EMBAJADA DEL PERÚ EN EL JAPÓN" },
      ],
      tables: [
        {
          rowCount: 3,
          columnCount: 3,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "DOCUMENTO" },
            { rowIndex: 0, columnIndex: 1, content: "ASUNTO" },
            { rowIndex: 0, columnIndex: 2, content: "DESTINO" },
            { rowIndex: 1, columnIndex: 0, content: "DOS CAJAS DE CARTÓN" },
            { rowIndex: 1, columnIndex: 1, content: "En alcance al memorándum de la referencia," },
            { rowIndex: 1, columnIndex: 2, content: "EMBAJADA DEL PERÚ EN EL JAPÓN" },
          ],
        },
        {
          rowCount: 2,
          columnCount: 3,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "DOCUMENTO" },
            { rowIndex: 0, columnIndex: 1, content: "ASUNTO" },
            { rowIndex: 0, columnIndex: 2, content: "DESTINO" },
            { rowIndex: 1, columnIndex: 1, content: "se hace llegar doce ejemplares y se agradecerá avisar recibo." },
          ],
        },
      ],
    })

    expect(result.documento).toBe("DOS CAJAS DE CARTÓN")
    expect(result.asunto).toContain("En alcance al memorándum de la referencia,")
    expect(result.asunto).toContain("se hace llegar doce ejemplares y se agradecerá avisar recibo.")
    expect(result.destino).toBe("EMBAJADA DEL PERÚ EN EL JAPÓN")
  })
})
