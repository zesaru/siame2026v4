import { describe, expect, it } from "vitest"
import { parseHojaRemisionFromAzure } from "./hojas-remision-parser"

describe("parseHojaRemisionFromAzure", () => {
  it("extracts documento, asunto y destino desde tabla aunque la cabecera no este en la fila 0", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (PCU) N° 5-18-A/6",
      keyValuePairs: [
        { key: "HOJA DE REMISION (PCU) N°", value: "5-18-A/6" },
        { key: "PARA", value: "EMBAJADA DEL PERU EN EL JAPON" },
        { key: "DE LA", value: "DIRECCION DE PROMOCION CULTURAL" },
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
            { rowIndex: 2, columnIndex: 0, content: "DOS CAJAS DE CARTON" },
            { rowIndex: 2, columnIndex: 1, content: "En alcance al memorandum" },
            { rowIndex: 3, columnIndex: 1, content: "se hace llegar doce ejemplares" },
            { rowIndex: 2, columnIndex: 2, content: "EMBAJADA DEL PERU EN EL JAPON" },
          ],
        },
      ],
    })

    expect(result.documento).toBe("DOS CAJAS DE CARTON")
    expect(result.asunto).toContain("En alcance al memorandum")
    expect(result.asunto).toContain("se hace llegar doce ejemplares")
    expect(result.destino).toBe("EMBAJADA DEL PERU EN EL JAPON")
  })

  it("falls back to PARA as destino only when the table cannot provide a valid destino", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (PCU) N° 5-18-A/6",
      keyValuePairs: [
        { key: "HOJA DE REMISION (PCU) N°", value: "5-18-A/6" },
        { key: "PARA", value: "EMBAJADA DEL PERU EN EL JAPON" },
        { key: "ASUNTO", value: "ASUNTO" },
      ],
      tables: [],
    })

    expect(result.destino).toBe("EMBAJADA DEL PERU EN EL JAPON")
  })

  it("merges compatible tables split across multiple pages", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (PCU) N° 5-18-A/6",
      keyValuePairs: [
        { key: "HOJA DE REMISION (PCU) N°", value: "5-18-A/6" },
        { key: "PARA", value: "EMBAJADA DEL PERU EN EL JAPON" },
      ],
      tables: [
        {
          rowCount: 3,
          columnCount: 3,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "DOCUMENTO" },
            { rowIndex: 0, columnIndex: 1, content: "ASUNTO" },
            { rowIndex: 0, columnIndex: 2, content: "DESTINO" },
            { rowIndex: 1, columnIndex: 0, content: "DOS CAJAS DE CARTON" },
            { rowIndex: 1, columnIndex: 1, content: "En alcance al memorandum de la referencia," },
            { rowIndex: 1, columnIndex: 2, content: "EMBAJADA DEL PERU EN EL JAPON" },
          ],
        },
        {
          rowCount: 2,
          columnCount: 3,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "DOCUMENTO" },
            { rowIndex: 0, columnIndex: 1, content: "ASUNTO" },
            { rowIndex: 0, columnIndex: 2, content: "DESTINO" },
            { rowIndex: 1, columnIndex: 1, content: "se hace llegar doce ejemplares y se agradecera avisar recibo." },
          ],
        },
      ],
    })

    expect(result.documento).toBe("DOS CAJAS DE CARTON")
    expect(result.asunto).toContain("En alcance al memorandum de la referencia,")
    expect(result.asunto).toContain("se hace llegar doce ejemplares y se agradecera avisar recibo.")
    expect(result.destino).toBe("EMBAJADA DEL PERU EN EL JAPON")
  })

  it("falls back to positional columns when the table has no recognizable headers", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (PCU) N° 5-18-A/6",
      keyValuePairs: [{ key: "HOJA DE REMISION (PCU) N°", value: "5-18-A/6" }],
      tables: [
        {
          rowCount: 2,
          columnCount: 3,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "DOS CAJAS DE CARTON" },
            { rowIndex: 0, columnIndex: 1, content: "Se remiten muestras para evaluacion" },
            { rowIndex: 0, columnIndex: 2, content: "EMBAJADA DEL PERU EN JAPON" },
            { rowIndex: 1, columnIndex: 1, content: "Favor avisar recibo" },
          ],
        },
      ],
    })

    expect(result.documento).toBe("DOS CAJAS DE CARTON")
    expect(result.asunto).toContain("Se remiten muestras para evaluacion")
    expect(result.asunto).toContain("Favor avisar recibo")
    expect(result.destino).toBe("EMBAJADA DEL PERU EN JAPON")
  })

  it("extracts remitente from the inline DE LA field in content when key-value extraction is noisy", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: [
        "HOJA DE REMISION (PCO) N° 5-18-A/7",
        "PARA : EMBAJADA DEL PERU EN JAPON",
        "DE LA : DIRECCION DE PROMOCION COMERCIAL",
        "FECHA : Lima, 3 de Marzo del 2025",
      ].join("\n"),
      keyValuePairs: [
        { key: "HOJA DE REMISION (PCO) N°", value: "5-18-A/7" },
        { key: "PARA", value: "EMBAJADA DEL PERU EN JAPON" },
        { key: "DE", value: ":unselected:" },
      ],
      tables: [],
    })

    expect(result.remitente).toBe("DIRECCION DE PROMOCION COMERCIAL")
  })

  it("ignores placeholder values in DE LA and falls back to the inline content", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: [
        "HOJA DE REMISION (PCO) N° 5-18-A/8",
        "PARA : EMBAJADA DEL PERU EN JAPON",
        "DE LA : DIRECCION DE PROMOCION COMERCIAL",
      ].join("\n"),
      keyValuePairs: [
        { key: "HOJA DE REMISION (PCO) N°", value: "5-18-A/8" },
        { key: "DE LA", value: ":unselected:" },
      ],
      tables: [],
    })

    expect(result.remitente).toBe("DIRECCION DE PROMOCION COMERCIAL")
  })

  it("converts an inline fecha like 3 de marzo del 2025 when key-value extraction is missing", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: [
        "HOJA DE REMISION (PCO) N° 5-18-A/8",
        "DE LA : DIRECCION DE PROMOCION COMERCIAL",
        "FECHA : Lima, 3 de marzo del 2025",
      ].join("\n"),
      keyValuePairs: [{ key: "HOJA DE REMISION (PCO) N°", value: "5-18-A/8" }],
      tables: [],
    })

    expect(result.fecha?.toISOString().split("T")[0]).toBe("2025-03-03")
  })

  it("extracts remitente when multiple labeled fields are serialized in the same content line", async () => {
    const result = await parseHojaRemisionFromAzure({
      content:
        "HOJA DE REMISION (PCO) N° 5-18-A/7 PARA : EMBAJADA DEL PERU EN JAPON DE LA : DIRECCION DE PROMOCION COMERCIAL FECHA : Lima, 3 de marzo del 2025 REFERENCIA : L-TOKIO001712025",
      keyValuePairs: [{ key: "HOJA DE REMISION (PCO) N°", value: "5-18-A/7" }],
      tables: [],
    })

    expect(result.remitente).toBe("DIRECCION DE PROMOCION COMERCIAL")
    expect(result.para).toBe("EMBAJADA DEL PERU EN JAPON")
    expect(result.fecha?.toISOString().split("T")[0]).toBe("2025-03-03")
  })

  it("does not confuse the institutional slogan with the DE LA remitente field", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: [
        '"DECENIO DE LA IGUALDAD DE OPORTUNIDADES PARA MUJERES Y HOMBRES"',
        '"Ano de la recuperacion y consolidacion de la economia peruana"',
        "HOJA DE REMISION (PCO) N° 5-18-A/7",
        "PARA : EMBAJADA DEL PERU EN JAPON",
        "DE LA : DIRECCION DE PROMOCION COMERCIAL",
        "FECHA : Lima, 3 de marzo del 2025",
      ].join("\n"),
      keyValuePairs: [{ key: "HOJA DE REMISION (PCO) N°", value: "5-18-A/7" }],
      tables: [],
    })

    expect(result.remitente).toBe("DIRECCION DE PROMOCION COMERCIAL")
  })

  it("splits numeroCompleto and descripcionEmpaque when OCR concatenates the package text", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (PCU) N° 5-18-A/6CAJA2DECARTON",
      keyValuePairs: [{ key: "HOJA DE REMISION (PCU) N°", value: "5-18-A/6CAJA2DECARTON" }],
      tables: [],
    })

    expect(result.numeroCompleto).toBe("HR N°5-18-A/6")
    expect(result.descripcionEmpaque).toBe("CAJA 2 DE CARTON")
  })

  it("extracts PAQUETE into descripcionEmpaque when it is attached to the HR number", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (PCU) N° 5-18-A/4PAQUETE",
      keyValuePairs: [{ key: "HOJA DE REMISION (PCU) N°", value: "5-18-A/4PAQUETE" }],
      tables: [],
    })

    expect(result.numeroCompleto).toBe("HR N°5-18-A/4")
    expect(result.descripcionEmpaque).toBe("PAQUETE")
  })

  it("extracts numeroCompleto and descripcionEmpaque from content-only header", async () => {
    const result = await parseHojaRemisionFromAzure({
      content: "HOJA DE REMISION (OGA) N° 5-18-A/19 CAJA",
      keyValuePairs: [],
      tables: [],
    })

    expect(result.siglaUnidad).toBe("OGA")
    expect(result.numeroCompleto).toBe("HR N°5-18-A/19")
    expect(result.descripcionEmpaque).toBe("CAJA")
  })
})
