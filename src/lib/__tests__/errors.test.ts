import { describe, it, expect } from 'vitest'
import { normalizeError } from '../errors'
import type { ApiError } from '../errors'

describe('normalizeError', () => {
  it('maps DRF detail string to message', () => {
    const axiosError = {
      response: {
        status: 400,
        data: { detail: 'Not found.' },
      },
      message: 'Request failed with status code 400',
    }

    const result: ApiError = normalizeError(axiosError)

    expect(result).toEqual({
      status: 400,
      message: 'Not found.',
    })
  })

  it('maps DRF field-dict to fieldErrors', () => {
    const axiosError = {
      response: {
        status: 422,
        data: {
          email: ['This field is required.'],
          password: ['Too short.', 'Must contain a number.'],
        },
      },
      message: 'Request failed with status code 422',
    }

    const result: ApiError = normalizeError(axiosError)

    expect(result.status).toBe(422)
    expect(result.fieldErrors).toEqual({
      email: 'This field is required.',
      password: 'Too short.',
    })
    expect(result.message).toBe('Validation failed.')
  })

  it('maps DRF non_field_errors array to message', () => {
    const axiosError = {
      response: {
        status: 400,
        data: { non_field_errors: ['Unable to log in with provided credentials.'] },
      },
      message: 'Request failed with status code 400',
    }

    const result: ApiError = normalizeError(axiosError)

    expect(result).toEqual({
      status: 400,
      message: 'Unable to log in with provided credentials.',
    })
  })

  it('maps network error (no response) to status 0 and friendly message', () => {
    const networkError = {
      response: undefined,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    }

    const result: ApiError = normalizeError(networkError)

    expect(result.status).toBe(0)
    expect(result.message).toBe('Network error. Please check your connection.')
  })

  it('maps timeout error to status 0 and friendly message', () => {
    const timeoutError = {
      response: undefined,
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
    }

    const result: ApiError = normalizeError(timeoutError)

    expect(result.status).toBe(0)
    expect(result.message).toBe('Request timed out. Please try again.')
  })

  it('preserves optional code field when present in DRF response', () => {
    const axiosError = {
      response: {
        status: 403,
        data: { detail: 'Permission denied.', code: 'permission_denied' },
      },
      message: 'Request failed with status code 403',
    }

    const result: ApiError = normalizeError(axiosError)

    expect(result).toEqual({
      status: 403,
      message: 'Permission denied.',
      code: 'permission_denied',
    })
  })
})
