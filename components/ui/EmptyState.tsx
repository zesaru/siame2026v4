import { Card, CardContent } from "./card"

interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  message?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center h-64 ${className}`}>
      <div className="text-center">
        {icon}
        {title && <p className="text-[var(--kt-text-muted)] font-medium mb-2">{title}</p>}
        {message && <p className="text-[var(--kt-text-muted)] text-sm">{message}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
