import { Button } from "./button"
import { Card, CardContent } from "./card"

interface ErrorStateProps {
  error: string
  onRetry?: () => void
  retryText?: string
  icon?: React.ReactNode
}

export function ErrorState({
  error,
  onRetry,
  retryText = "Intentar de nuevo",
  icon = <div className="text-4xl mb-4">❌</div>,
}: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="text-center">
          {icon}
          <p className="text-[var(--kt-danger)] font-medium mb-4">{error}</p>
          {onRetry && <Button onClick={onRetry} size="sm">{retryText}</Button>}
        </div>
      </CardContent>
    </Card>
  )
}
