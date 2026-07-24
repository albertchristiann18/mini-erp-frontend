import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Loading, ErrorState, Empty, QueryState } from '../queryPrimitives'
import type { ApiError } from '../../../lib/errors'

describe('Loading', () => {
  it('renders a loading indicator', () => {
    render(<Loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('displays the error message from ApiError', () => {
    const error: ApiError = { status: 500, message: 'Internal server error' }
    render(<ErrorState error={error} />)
    expect(screen.getByText('Internal server error')).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    const error: ApiError = { status: 500, message: 'Something went wrong' }
    render(<ErrorState error={error} onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry is not provided', () => {
    const error: ApiError = { status: 404, message: 'Not found' }
    render(<ErrorState error={error} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })
})

describe('Empty', () => {
  it('renders default "No data found." message', () => {
    render(<Empty />)
    expect(screen.getByText('No data found.')).toBeInTheDocument()
  })

  it('renders custom message when provided', () => {
    render(<Empty message="No orders yet." />)
    expect(screen.getByText('No orders yet.')).toBeInTheDocument()
  })
})

describe('QueryState', () => {
  const makeQuery = (overrides: Record<string, unknown>) => ({
    isLoading: false,
    isError: false,
    error: null,
    data: undefined,
    refetch: vi.fn(),
    ...overrides,
  })

  it('renders Loading when isLoading is true', () => {
    const query = makeQuery({ isLoading: true })
    render(
      <QueryState query={query}>
        {() => <div>Content</div>}
      </QueryState>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders ErrorState when isError is true', () => {
    const apiError: ApiError = { status: 500, message: 'Failed to load' }
    const query = makeQuery({ isError: true, error: apiError })
    render(
      <QueryState query={query}>
        {() => <div>Content</div>}
      </QueryState>,
    )
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders Empty when data is undefined and not loading', () => {
    const query = makeQuery({ data: undefined })
    render(
      <QueryState query={query}>
        {() => <div>Content</div>}
      </QueryState>,
    )
    expect(screen.getByText('No data found.')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders children with data when query succeeds', () => {
    const query = makeQuery({ data: { id: 1, name: 'Test' } })
    render(
      <QueryState query={query}>
        {(data) => {
          const typed = data as unknown as { name: string }
          return <div>Name: {typed.name}</div>
        }}
      </QueryState>,
    )
    expect(screen.getByText('Name: Test')).toBeInTheDocument()
  })

  it('passes refetch as retry handler to ErrorState', () => {
    const refetch = vi.fn()
    const apiError: ApiError = { status: 500, message: 'Fetch failed' }
    const query = makeQuery({ isError: true, error: apiError, refetch })
    render(
      <QueryState query={query}>
        {() => <div>Content</div>}
      </QueryState>,
    )

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
