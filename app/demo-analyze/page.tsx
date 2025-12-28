"use client"

import { useState } from "react"
import { SmartDocumentUpload } from "@/components/documents/SmartDocumentUpload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DemoAnalyzePage() {
  const router = useRouter()
  const [uploadResult, setUploadResult] = useState<any>(null)

  const handleUploadComplete = (result: any) => {
    setUploadResult(result)
    console.log("Upload result:", result)
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-[var(--kt-text-dark)] mb-2">
          Análisis Inteligente de Documentos
        </h1>
        <p className="text-[var(--kt-text-muted)]">
          Prueba nuestro sistema de análisis automático que detecta:
          <br />
          <span className="font-medium text-lg">
            1. Idioma • 2. Tipo de Documento • 3. Dirección (Entrada/Salida)
          </span>
        </p>
      </div>

      {/* Flow Description */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Flujo de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--kt-primary)] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Subir Documento</h3>
              <p className="text-sm text-[var(--kt-text-muted)]">
                Arrastra o selecciona un documento PDF, DOCX, XLSX o imagen
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--kt-info)] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Análisis con IA</h3>
              <p className="text-sm text-[var(--kt-text-muted)]">
                Nuestro sistema extrae y detecta información automáticamente
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--kt-success)] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Verificación</h3>
              <p className="text-sm text-[var(--kt-text-muted)]">
                Confirma o corrige los datos antes de guardar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Component */}
      <SmartDocumentUpload
        onUploadComplete={handleUploadComplete}
        onError={(error) => console.error("Upload error:", error)}
      />

      {/* Expected Results */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>¿Qué Detecta el Sistema?</CardTitle>
          <CardDescription>
            Nuestra inteligencia artificial detecta automáticamente los siguientes elementos:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">1</span>
                Idioma
              </h4>
              <ul className="space-y-1 text-sm text-[var(--kt-text-muted)]">
                <li>• Español</li>
                <li>• Inglés</li>
                <li>• Francés</li>
                <li>• Portugués</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">2</span>
                Tipo de Documento
              </h4>
              <ul className="space-y-1 text-sm text-[var(--kt-text-muted)]">
                <li>• Guía de Valija</li>
                <li>• Hoja de Remisión</li>
                <li>• Nota Diplomática</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">3</span>
                Dirección
              </h4>
              <ul className="space-y-1 text-sm text-[var(--kt-text-muted)]">
                <li>• Entrada (Importación)</li>
                <li>• Salida (Exportación)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Documents Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Documentos de Ejemplo</CardTitle>
          <CardDescription>
            Puedes usar cualquier documento, pero estos funcionan especialmente bien:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[var(--kt-gray-50)] rounded-lg">
              <div className="w-10 h-10 bg-[var(--kt-primary)] text-white rounded flex items-center justify-center text-sm font-bold">
                GV
              </div>
              <div>
                <p className="font-medium">Guía de Valija</p>
                <p className="text-sm text-[var(--kt-text-muted)]">Busca palabras como "GUÍA", "VALIJ", "EMBAC"</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[var(--kt-gray-50)] rounded-lg">
              <div className="w-10 h-10 bg-[var(--kt-info)] text-white rounded flex items-center justify-center text-sm font-bold">
                HR
              </div>
              <div>
                <p className="font-medium">Hoja de Remisión</p>
                <p className="text-sm text-[var(--kt-text-muted)]">Busca palabras como "REMISIÓN", "REMITO", "DESPACH"</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[var(--kt-gray-50)] rounded-lg">
              <div className="w-10 h-10 bg-[var(--kt-success)] text-white rounded flex items-center justify-center text-sm font-bold">
                ND
              </div>
              <div>
                <p className="font-medium">Nota Diplomática</p>
                <p className="text-sm text-[var(--kt-text-muted)]">Busca palabras como "NOTA", "COMUNIC", "MEMORÁND"</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}