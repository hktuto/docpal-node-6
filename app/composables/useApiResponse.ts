import type { SuccessResponse } from '#shared/types/api'
import type { UseFetchOptions } from '#app'

/**
 * Wrapper around useFetch that automatically extracts data from the standardized API response format
 * 
 * Usage:
 * ```ts
 * const { data, pending, error, refresh } = await useApiResponse<App>('/api/apps/my-app')
 * // data will be the actual App object, not the wrapped response
 * ```
 */
export async function useApiResponse<T>(
  url: string | (() => string),
  options?: UseFetchOptions<SuccessResponse<T>>
) {
  const result = await useFetch<SuccessResponse<T>>(url, options)
  
  // Extract the data field from the response
  const data = computed(() => result.data.value?.data)
  const meta = computed(() => result.data.value?.meta)
  const success = computed(() => result.data.value?.success ?? false)
  
  return {
    data,
    meta,
    success,
    pending: result.pending,
    error: result.error,
    refresh: result.refresh,
    execute: result.execute,
    clear: result.clear,
    status: result.status,
  }
}

/**
 * Wrapper around $fetch that automatically handles the standardized API response format
 * 
 * Usage:
 * ```ts
 * const app = await $apiResponse<App>('/api/apps/my-app')
 * // Returns the actual App object, not the wrapped response
 * ```
 */
export async function $apiResponse<T>(
  url: string,
  options?: any
): Promise<T> {
  const response = await $fetch<SuccessResponse<T>>(url, options)
  return response.data
}

