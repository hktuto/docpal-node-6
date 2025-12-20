import type { SuccessResponse, ResponseMeta } from '#shared/types/api'

/**
 * Create a standardized success response
 * 
 * @param data - The response data
 * @param meta - Optional metadata (pagination, message, etc.)
 * @returns Standardized success response
 */
export function successResponse<T>(data: T, meta?: ResponseMeta): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return response
}

/**
 * Create a success response with pagination
 * 
 * @param data - The response data (array)
 * @param total - Total number of items
 * @param limit - Items per page
 * @param offset - Current offset
 * @returns Success response with pagination metadata
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): SuccessResponse<T[]> {
  return successResponse(data, {
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  })
}

/**
 * Create a success response with a message
 * 
 * @param data - The response data (can be null)
 * @param message - Success message
 * @returns Success response with message
 */
export function messageResponse<T>(data: T | null, message: string): SuccessResponse<T | null> {
  return successResponse(data, { message })
}

