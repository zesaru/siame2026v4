import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface UseFetchWithAbortOptions<T> {
  fetchFn: (signal: AbortSignal) => Promise<T>
  deps?: unknown[]
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
  const fetchFnRef = useRef(fetchFn)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const requestIdRef = useRef(0)
  const depsKey = useMemo(() => JSON.stringify(deps), [deps])

  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

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
    const requestId = ++requestIdRef.current

    setLoading(true)
    setError(null)

    try {
      const result = await fetchFnRef.current(abortController.signal)

      if (requestId === requestIdRef.current && !abortController.signal.aborted) {
        setData(result)
        onSuccessRef.current?.(result)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name !== 'AbortError' && requestId === requestIdRef.current) {
          const errorMsg = err.message
          setError(errorMsg)
          onErrorRef.current?.(err)
        }
      }
    } finally {
      if (requestId === requestIdRef.current && !abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [enabled])

  useEffect(() => {
    fetchData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData, depsKey])

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
