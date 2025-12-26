"use client"

import { useState } from "react"
import DocumentUpload from "@/components/DocumentUpload"
import DocumentResults from "@/components/DocumentResults"
import DocumentHistory from "@/components/DocumentHistory"
import { DocumentAnalysisResult } from "@/lib/document-intelligence"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Icon from "@/components/ui/Icon"

interface DocumentsClientProps {
  session: any
}

export default function DocumentsClient({ session }: DocumentsClientProps) {
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [fileUrl, setFileUrl] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleAnalysisComplete = (result: DocumentAnalysisResult, file: File) => {
    console.log("handleAnalysisComplete called with:", result)
    setAnalysisResult(result)
    setFileName(result.metadata.title || "Document")

    // Create object URL for the file to display it
    const url = URL.createObjectURL(file)
    setFileUrl(url)

    setError("")
    console.log("State updated - analysisResult set, fileName:", result.metadata.title)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setError("")
  }

  const resetAnalysis = () => {
    setAnalysisResult(null)
    setFileName("")
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl)
      setFileUrl("")
    }
  }

  const handleSelectDocument = async (document: any) => {
    try {
      const response = await fetch(`/api/documents/${document.id}`)
      if (!response.ok) throw new Error("Failed to fetch document")

      const fullDocument = await response.json()

      // Convert database document to analysis result format
      const result: DocumentAnalysisResult = {
        content: fullDocument.contentText || "",
        tables: fullDocument.tables || [],
        keyValuePairs: fullDocument.keyValuePairs || [],
        entities: fullDocument.entities || [],
        metadata: fullDocument.metadata || {},
      }

      setAnalysisResult(result)
      setFileName(fullDocument.fileName)
      setShowHistory(false)
    } catch (error) {
      console.error("Error loading document:", error)
      setError("Error al cargar el documento. Por favor intenta nuevamente.")
      setIsModalOpen(true)
    }
  }

  const features = [
    {
      title: "Extracción de Texto",
      description: "Extrae todo el contenido de texto de tus documentos",
      icon: "document",
      color: "primary",
    },
    {
      title: "Detección de Tablas",
      description: "Identifica y extrae datos tabulares automáticamente",
      icon: "chart",
      color: "success",
    },
    {
      title: "Pares Clave-Valor",
      description: "Extrae información estructurada como formularios",
      icon: "check",
      color: "info",
    },
    {
      title: "Reconocimiento de Entidades",
      description: "Identifica personas, organizaciones, fechas y más",
      icon: "search",
      color: "warning",
    },
  ]

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-[var(--kt-gray-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--kt-text-dark)]">
                Document Intelligence
              </h1>
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-[var(--kt-primary)] bg-[var(--kt-primary-light)] rounded-full">
                <Icon name="check" size="sm" />
                Powered by Azure AI
              </span>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowHistory(true)}
                className="flex-shrink-0"
              >
                <Icon name="refresh" size="sm" className="mr-2" />
                Ver Historial
              </Button>
              {analysisResult && (
                <Button
                  onClick={resetAnalysis}
                  className="flex-shrink-0 bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]"
                >
                  <Icon name="document" size="sm" className="mr-2" />
                  Analizar Otro
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        {!analysisResult ? (
          <DocumentUpload
            onAnalysisComplete={handleAnalysisComplete}
            onError={handleError}
          />
        ) : (
          <DocumentResults result={analysisResult} fileName={fileName} fileUrl={fileUrl} />
        )}
      </div>

      {/* Error Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-[var(--kt-danger-light)] rounded-full flex items-center justify-center">
                <Icon name="alert" className="text-[var(--kt-danger)]" />
              </div>
              <DialogTitle>Error</DialogTitle>
            </div>
          </DialogHeader>
          <Alert variant="destructive" className="bg-[var(--kt-danger-light)] border-[var(--kt-danger)] text-[var(--kt-danger)]">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={closeModal} variant="outline">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      {showHistory && (
        <DocumentHistory
          onSelectDocument={handleSelectDocument}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Features Section */}
      {!analysisResult && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="bg-white rounded-xl shadow-[var(--kt-shadow-card)] border border-[var(--kt-gray-200)] p-8">
            <h2 className="text-xl font-semibold text-[var(--kt-text-dark)] mb-2">Características</h2>
            <p className="text-[var(--kt-text-muted)] mb-6">
              Potenciado por Azure AI Form Recognizer para extracción inteligente de datos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                      feature.color === "primary"
                        ? "bg-[var(--kt-primary-light)]"
                        : feature.color === "success"
                        ? "bg-[var(--kt-success-light)]"
                        : feature.color === "info"
                        ? "bg-[var(--kt-info-light)]"
                        : "bg-[var(--kt-warning-light)]"
                    }`}
                  >
                    <Icon
                      name={feature.icon as any}
                      className={
                        feature.color === "primary"
                          ? "text-[var(--kt-primary)]"
                          : feature.color === "success"
                          ? "text-[var(--kt-success)]"
                          : feature.color === "info"
                          ? "text-[var(--kt-info)]"
                          : "text-[var(--kt-warning)]"
                      }
                    />
                  </div>
                  <h3 className="font-medium text-[var(--kt-text-dark)] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[var(--kt-text-muted)]">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
