import type { UseFetchOptions } from '#app'
import type { FetchError } from 'ofetch'

/**
 * Custom useFetch wrapper using our $api instance
 * 
 * The $api instance:
 * - Handles global errors (401 -> redirect to login, 500 -> show error)
 * - Automatically extracts data from standardized API response format
 * - Sets proper headers
 * 
 * Usage:
 * ```ts
 * const { data, pending, error, refresh } = useApi<App>('/apps/my-app')
 * ```
 */
export function useApi<T>(
  url: string | (() => string),
  options?: UseFetchOptions<T>
) {
  return useFetch(url, {
    ...options,
    $fetch: useNuxtApp().$api as typeof $fetch,
  })
}