/**
 * API Utilities
 * 
 * Common API request helpers
 */

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  statusCode: number;
  statusMessage: string;
  data?: any;
}

/**
 * Make an API request with proper error handling
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw {
      statusCode: response.status,
      statusMessage: response.statusText,
      ...error
    };
  }
  
  return response.json();
}

/**
 * GET request
 */
export function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<ApiResponse<T>>(url, { method: 'GET' });
}

/**
 * POST request
 */
export function apiPost<T>(url: string, data: any): Promise<ApiResponse<T>> {
  return apiRequest<ApiResponse<T>>(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PATCH request
 */
export function apiPatch<T>(url: string, data: any): Promise<ApiResponse<T>> {
  return apiRequest<ApiResponse<T>>(url, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request
 */
export function apiDelete(url: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(url, { method: 'DELETE' });
}

