import { useState, useEffect, useRef, useCallback } from 'react'

interface UseFetchWithAbortOptions<T> {
  fetchFn: (signal: AbortSignal) => Promise<T>
  deps?: any[]
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  enabled?: boolean
}

interface UseFetchWithAbortResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Custom hook for fetching data with automatic abort controller
 * Prevents memory leaks and handles cleanup automatically
 *
 * @example
 * const { data, loading, error, refetch } = useFetchWithAbort({
 *   fetchFn: async (signal) => {
 *     const res = await fetch('/api/data', { signal })
 *     return res.json()
 *   },
 *   deps: [id],
 *   enabled: !!id
 * })
 */
export function useFetchWithAbort<T>({
  fetchFn,
  deps = [],
  onSuccess,
  onError,
  enabled = true,
}: UseFetchWithAbortOptions<T>): UseFetchWithAbortResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    let mounted = true

    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn(abortController.signal)

      if (mounted) {
        setData(result)
        onSuccess?.(result)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name !== 'AbortError' && mounted) {
          const errorMsg = err.message
          setError(errorMsg)
          onError?.(err)
        }
      }
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }

    return () => {
      mounted = false
    }
  }, [fetchFn, enabled, ...deps])

  useEffect(() => {
    fetchData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch,
  }
}
