/**
 * Icon Component - Optimized with lucide-react tree-shaking
 *
 * All icons now use lucide-react for automatic tree-shaking.
 * This reduces bundle size by only importing icons that are actually used.
 */

import * as LucideIcons from "lucide-react"
import { logger } from "@/lib/logger"
import { forwardRef } from "react"

interface IconProps {
  name: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
}

// Mapping from custom icon names to lucide-react icon names
const iconMap: Record<string, keyof typeof LucideIcons> = {
  home: "Home",
  document: "FileText",
  suitcase: "Briefcase",
  shipping: "Package",
  chart: "BarChart3",
  menu: "Menu",
  x: "X",
  bell: "Bell",
  user: "User",
  logout: "LogOut",
  chevronLeft: "ChevronLeft",
  chevronRight: "ChevronRight",
  refresh: "RefreshCw",
  search: "Search",
  plus: "Plus",
  trash: "Trash2",
  eye: "Eye",
  check: "Check",
  alert: "AlertTriangle",
  upload: "Upload",
  lock: "Lock",
  users: "Users",
  shield: "Shield",
  table: "Table",
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ name, className = "", size = "md" }, ref) => {
    const lucideIconName = iconMap[name]

    if (!lucideIconName) {
      logger.warn(`Icon "${name}" not found in mapping`)
      return null
    }

    // Get the icon component from lucide-react (tree-shaken)
    const IconComponent = LucideIcons[lucideIconName]

    if (!IconComponent) {
      logger.warn(`Lucide icon "${lucideIconName}" not found`)
      return null
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}
      >
        <IconComponent className="w-full h-full" strokeWidth={2} />
      </span>
    )
  }
)

Icon.displayName = "Icon"

export default Icon
