import { describe, expect, it } from "vitest"
import { DocumentAnalyzer } from "./document-analyzer"

describe("document-analyzer", () => {
  it("detects oficio and requests manual review on mixed blocks", async () => {
    const content = [
      "GUIA DE VALIJA DIPLOMATICA ENTRADA",
      "OFICIO N° 123-2026 de mi consideración",
    ].join("\f")

    const result = await DocumentAnalyzer.analyze(content, [], [])

    expect(result.blocks.length).toBe(2)
    expect(result.blocks[0].documentType).toBe("guia_valija")
    expect(result.blocks[1].documentType).toBe("oficio")
    expect(result.requiresManualReview).toBe(true)
  })

  it("detects salida and extraordinaria for valija", async () => {
    const content = "GUIA DE VALIJA SALIDA EXTRAORDINARIA DESPACHO OUTBOUND"
    const result = await DocumentAnalyzer.analyze(content, [], [])

    expect(result.direccion).toBe("salida")
    expect(result.valijaClassification.tipoValija).toBe("SALIDA")
    expect(result.valijaClassification.isExtraordinaria).toBe(true)
  })

  it("detects ordinaria when ordinary markers are present", async () => {
    const content = "GUIA DE VALIJA ENTRADA ORDINARIA RECIBIDO LLEGADA INBOUND IMPORT"
    const result = await DocumentAnalyzer.analyze(content, [], [])

    expect(result.valijaClassification.tipoValija).toBe("ENTRADA")
    expect(result.valijaClassification.isExtraordinaria).toBe(false)
    expect(result.requiresManualReview).toBe(false)
  })

  it("requests manual review when extraordinary and ordinary signals conflict", async () => {
    const content = "GUIA DE VALIJA EXTRAORDINARIA NO EXTRAORDINARIA ENTRADA RECIBIDO LLEGADA INBOUND"
    const result = await DocumentAnalyzer.analyze(content, [], [])

    expect(result.valijaClassification.isExtraordinaria).toBeNull()
    expect(result.requiresManualReview).toBe(true)
    expect(result.reviewReason).toBe("Ambiguous valija extraordinary classification")
  })
})
