/**
 * Normalized error shape for all API calls.
 *
 * - status: HTTP status code (0 for network/timeout errors)
 * - message: Human-readable top-level message
 * - fieldErrors: Per-field validation errors (from DRF field-dict)
 * - code: Optional DRF error code string
 */
export interface ApiError {
  status: number
  message: string
  fieldErrors?: Record<string, string>
  code?: string
}

/**
 * Normalizes an Axios error (or any thrown value) into a consistent ApiError.
 *
 * DRF shapes handled:
 *   - { detail: string }            → message = detail
 *   - { field: [msgs] }             → fieldErrors + "Validation failed." message
 *   - { non_field_errors: [msgs] }  → message = first error
 *   - network/timeout (no response) → status 0, friendly message
 */
export function normalizeError(error: unknown): ApiError {
  // Type-narrow for axios-shaped errors
  const axiosLike = error as {
    response?: {
      status: number
      data?: unknown
    }
    code?: string
    message?: string
  }

  // No response → network or timeout error
  if (!axiosLike.response) {
    const code = axiosLike.code ?? ''
    if (code === 'ECONNABORTED' || (axiosLike.message ?? '').toLowerCase().includes('timeout')) {
      return { status: 0, message: 'Request timed out. Please try again.' }
    }
    return { status: 0, message: 'Network error. Please check your connection.' }
  }

  const { status, data } = axiosLike.response

  if (!data || typeof data !== 'object') {
    return { status, message: 'An unexpected error occurred.' }
  }

  const body = data as Record<string, unknown>

  // { detail: string, code?: string } — standard DRF error
  if (typeof body.detail === 'string') {
    const result: ApiError = { status, message: body.detail }
    if (typeof body.code === 'string') {
      result.code = body.code
    }
    return result
  }

  // { non_field_errors: string[] }
  if (Array.isArray(body.non_field_errors) && body.non_field_errors.length > 0) {
    return { status, message: String(body.non_field_errors[0]) }
  }

  // Field-dict: { field: string[] }
  const fieldErrors: Record<string, string> = {}
  let hasFieldErrors = false
  for (const [key, val] of Object.entries(body)) {
    if (Array.isArray(val) && val.length > 0) {
      fieldErrors[key] = String(val[0])
      hasFieldErrors = true
    }
  }
  if (hasFieldErrors) {
    return { status, message: 'Validation failed.', fieldErrors }
  }

  return { status, message: 'An unexpected error occurred.' }
}
