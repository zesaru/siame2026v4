"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { getSupportedFormats } from "@/lib/document-intelligence"

interface DocumentUploadProps {
  onAnalysisComplete: (result: any, file: File) => void
  onError: (error: string) => void
}

export default function DocumentUpload({ onAnalysisComplete, onError }: DocumentUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const supportedFormats = getSupportedFormats()

    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      onError(`Unsupported file format. Supported formats: ${supportedFormats.join(", ")}`)
      return
    }

    setSelectedFile(file)
    handleAnalyzeDocument(file)
  }, [onError])

  const handleAnalyzeDocument = async (file: File) => {
    setIsAnalyzing(true)
    setProgress(10)

    let progressInterval: NodeJS.Timeout | null = null

    try {
      // Simulate progress updates
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      // Create FormData and send to API
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || "Failed to analyze document")
      }

      const result = await response.json()
      console.log("Analysis completed, result:", result)
      console.log("Result has tables:", result.tables?.length)
      console.log("Result has keyValuePairs:", result.keyValuePairs?.length)

      // 🔍 MOSTRAR KEYS CAPTURADAS EN CONSOLA DEL NAVEGADOR
      console.log("\n════════════════════════════════════════════════════════════════")
      console.log("📋 JSON DE KEYS CAPTURADAS (GUÍA DE VALIJA) - CONSOLA NAVEGADOR:")
      console.log("════════════════════════════════════════════════════════════════")

      if (result.keyValuePairs && result.keyValuePairs.length > 0) {
        const keysMap = result.keyValuePairs.reduce((acc: any, pair: any) => {
          acc[pair.key] = pair.value
          return acc
        }, {})

        console.log(JSON.stringify(keysMap, null, 2))

        console.log("\n──────────────────────────────────────────────────────────────")
        console.log("📝 LISTADO DE KEYS INDIVIDUALES:")
        console.log("──────────────────────────────────────────────────────────────")
        result.keyValuePairs.forEach((pair: any, idx: number) => {
          console.log(`  ${idx + 1}. "${pair.key}" = "${pair.value}"`)
        })
      } else {
        console.log("⚠️  No se detectaron pares clave-valor")
      }

      console.log("\n════════════════════════════════════════════════════════════════\n")

      if (progressInterval) {
        clearInterval(progressInterval)
      }

      setProgress(100)
      onAnalysisComplete(result, file)
      setIsAnalyzing(false)
      setProgress(0)
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setIsAnalyzing(false)
      setProgress(0)
      onError(error instanceof Error ? error.message : "Failed to analyze document")
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.heif'],
      'application/vnd.openxmlformats-officedocument.*': ['.docx', '.xlsx', '.pptx'],
      'text/*': ['.txt', '.html']
    },
    multiple: false,
    disabled: isAnalyzing
  })

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Document Intelligence
        </h2>
        <p className="text-gray-600">
          Upload a document to extract text, tables, key-value pairs, and entities using AI-powered analysis.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : isAnalyzing
              ? "border-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} disabled={isAnalyzing} />

        <div className="flex flex-col items-center space-y-4">
          {isAnalyzing ? (
            <>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">Analyzing document...</p>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{progress}% complete</p>
              </div>
            </>
          ) : (
            <>
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? "Drop the document here" : "Drag & drop a document here"}
                </p>
                <p className="text-sm text-gray-600">
                  or click to select a file
                </p>
              </div>
              <div className="text-xs text-gray-500">
                Supported formats: PDF, Images, Word, Excel, PowerPoint, Text
              </div>
            </>
          )}
        </div>
      </div>

      {selectedFile && !isAnalyzing && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        </div>
      )}
    </div>
  )
}