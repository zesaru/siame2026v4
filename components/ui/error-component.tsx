import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ErrorComponentProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorComponent({ error, resetErrorBoundary }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.message || "Ocurrió un error inesperado al cargar el dashboard."}
      </p>
      <div className="flex gap-3">
        <Button onClick={resetErrorBoundary} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}