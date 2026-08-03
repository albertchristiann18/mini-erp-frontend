/**
 * Typed http wrapper around the axios client.
 *
 * Unwraps the axios response once so api functions can return `Promise<T>` directly
 * instead of `Promise<AxiosResponse<T>>`, eliminating per-hook `.then(r => r.data)` chains.
 *
 * Throws ApiError on failure (normalized by the response interceptor in api/client.ts).
 *
 * Usage in api modules:
 *   export const getCategories = (params?: Params) =>
 *     http.get<PaginatedResponse<Category>>('/category/', { params })
 */
import client from '../api/client'
import type { AxiosRequestConfig } from 'axios'

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.get<T>(url, config).then((r) => r.data)
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.post<T>(url, data, config).then((r) => r.data)
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.put<T>(url, data, config).then((r) => r.data)
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.patch<T>(url, data, config).then((r) => r.data)
  },

  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.delete<T>(url, config).then((r) => r.data)
  },
}
