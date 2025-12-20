/**
 * Standardized API Response Types
 * Based on JSend specification: https://github.com/omniti-labs/jsend
 */

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

/**
 * Generic metadata container
 */
export interface ResponseMeta {
  pagination?: PaginationMeta
  message?: string
  [key: string]: any // Allow additional meta fields
}

/**
 * Success response
 */
export interface SuccessResponse<T = any> {
  success: true
  data: T
  meta?: ResponseMeta
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Union of all possible API responses
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

