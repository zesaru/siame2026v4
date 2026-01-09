import { useEffect, useCallback, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface UseUnsavedChangesOptions {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Message to show when user tries to navigate away */
  message?: string
}

/**
 * Hook to prevent navigation when there are unsaved changes
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const [dirty, setDirty] = useState(false)
 *
 *   useUnsavedChanges({
 *     hasUnsavedChanges: dirty,
 *     message: "Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?"
 *   })
 *
 *   return <form onChange={() => setDirty(true)}>...</form>
 * }
 * ```
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  message = "Tienes cambios sin guardar. Si sales, perderás los cambios no guardados.",
}: UseUnsavedChangesOptions) {
  const router = useRouter()
  const pathname = usePathname()

  // Handle browser back/forward buttons and refresh
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Chrome requires returnValue to be set
      e.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasUnsavedChanges, message])

  // Intercept navigation when hasUnsavedChanges is true
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // Store original router methods
    const originalRouterPush = router.push.bind(router)
    const originalRouterReplace = router.replace.bind(router)
    const originalRouterBack = router.back.bind(router)

    // Override push
    const customPush = (href: string, options?: any) => {
      const confirmed = window.confirm(message)
      if (confirmed) {
        return originalRouterPush(href, options)
      }
    }

    // Override replace
    const customReplace = (href: string, options?: any) => {
      const confirmed = window.confirm(message)
      if (confirmed) {
        return originalRouterReplace(href, options)
      }
    }

    // Override back
    const customBack = () => {
      const confirmed = window.confirm(message)
      if (confirmed) {
        return originalRouterBack()
      }
    }

    // Assign custom methods
    router.push = customPush as any
    router.replace = customReplace as any
    router.back = customBack as any

    // Cleanup: restore original methods
    return () => {
      router.push = originalRouterPush
      router.replace = originalRouterReplace
      router.back = originalRouterBack
    }
  }, [hasUnsavedChanges, message, router, pathname])
}

/**
 * Hook to track form dirty state
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { isDirty, setDirty, resetDirty } = useDirtyState()
 *
 *   return (
 *     <form onChange={() => setDirty(true)}>
 *       <button disabled={!isDirty}>Save</button>
 *       <button onClick={resetDirty}>Cancel</button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useDirtyState(initialState = false) {
  const [isDirty, setIsDirty] = useState(initialState)

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty)
  }, [])

  const resetDirty = useCallback(() => {
    setIsDirty(false)
  }, [])

  return {
    isDirty,
    setDirty,
    resetDirty,
  }
}
