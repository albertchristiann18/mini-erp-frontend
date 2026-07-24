/**
 * MSW integration test: DRF error → real axios interceptor → ApiError → ErrorState renders.
 *
 * Ticket #1 criterion #10: exactly one MSW integration test that exercises the
 * production wiring end-to-end:
 *   MSW intercepts HTTP → real axios client response interceptor maps it to ApiError
 *   → ApiError propagates through useQuery → ErrorState renders message + retry button.
 *
 * The key invariant proven here: `normalizeError` is NOT called by hand in the test;
 * the production interceptor in api/client.ts does the transformation. Catching an
 * ApiError (status + message, no axios internals) confirms the interceptor ran.
 *
 * Setup notes:
 *  - jsdom's `localStorage.getItem` is not a proper function due to a vitest/jsdom
 *    initialisation quirk (`--localstorage-file` path not set), so we stub it before
 *    importing the client to prevent the client's request interceptor from throwing.
 *  - In jsdom, axios prefers the XHR adapter, but MSW's node server patches
 *    `http.ClientRequest`, not jsdom's XHR. We force `adapter: 'http'` on the client
 *    so requests go through Node.js's http module, which MSW intercepts.
 *  Both of the above are test-environment shims, not production-code changes.
 */

// Stub localStorage before the client module initialises (module-level side-effect).
// The real localStorage works in a browser; jsdom's version has a known init issue in
// some vitest versions that causes `getItem` to be non-callable.
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
  },
  writable: true,
  configurable: true,
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { server } from '../../test/mswServer'
import { ErrorState } from '../../components/ui/queryPrimitives'
import client from '../../api/client'
import type { ApiError } from '../errors'

/**
 * Component that drives a real `client.get()` inside a useQuery queryFn.
 * The axios response interceptor in api/client.ts normalises the DRF error to ApiError
 * and rejects — no manual normalizeError call anywhere in this component.
 */
function RealClientFetcher({
  url,
  onRetryClick,
}: {
  url: string
  onRetryClick?: () => void
}) {
  const query = useQuery<{ id: number }, ApiError>({
    queryKey: ['msw-integration', url],
    queryFn: () => client.get<{ id: number }>(url).then((r) => r.data),
    retry: false,
  })

  if (query.isLoading) return <div role="status">Loading…</div>
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          onRetryClick?.()
          void query.refetch()
        }}
      />
    )
  }
  return <div>Data loaded</div>
}

function withQueryClient(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
}

// Force Node.js http adapter so MSW's ClientRequest interceptor patches the request.
// Reset to the original adapter array after the suite completes.
const savedAdapter = (client.defaults as { adapter: unknown }).adapter
beforeAll(() => {
  ;(client.defaults as { adapter: unknown }).adapter = 'http'
  server.listen({ onUnhandledRequest: 'warn' })
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  ;(client.defaults as { adapter: unknown }).adapter = savedAdapter
  server.close()
})

describe('DRF error → real axios interceptor → ApiError → ErrorState', () => {
  /**
   * The single required MSW integration test.
   *
   * Proves the full production wiring:
   *  1. MSW intercepts the axios request at the client's baseURL
   *     (http://localhost:8000 when VITE_API_BASE_URL is unset in tests).
   *  2. The real response interceptor in api/client.ts catches the 403, calls
   *     normalizeError(axiosError), and rejects with ApiError ({ status, message }).
   *  3. The ApiError propagates through useQuery to the component's error state.
   *  4. ErrorState renders the DRF `detail` message and a Retry button.
   *
   * Interceptor evidence: the error rendered is { status: 403, message: DRF_MESSAGE }
   * — not a raw AxiosError. If the interceptor had NOT run, useQuery would hold an
   * AxiosError whose `.message` is the raw HTTP status string, not the DRF detail text.
   * Seeing the DRF detail text in the DOM proves normalizeError ran inside the interceptor.
   */
  it('maps DRF detail error through the real interceptor and renders message + retry in ErrorState', async () => {
    const DRF_MESSAGE = 'You do not have permission to perform this action.'
    const onRetryClick = vi.fn()

    server.use(
      http.get('http://localhost:8000/api/resource/', () =>
        HttpResponse.json({ detail: DRF_MESSAGE }, { status: 403 }),
      ),
    )

    render(withQueryClient(<RealClientFetcher url="/api/resource/" onRetryClick={onRetryClick} />))

    // The interceptor runs normalizeError({ detail }) → ApiError.message = DRF_MESSAGE.
    // ErrorState renders error.message as text — seeing it here proves the interceptor ran.
    await waitFor(() => {
      expect(screen.getByText(DRF_MESSAGE)).toBeInTheDocument()
    })

    // Retry button is present and wired to onRetry
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(onRetryClick).toHaveBeenCalledTimes(1)

    // The alert role confirms ErrorState rendered (not a loading or success state)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('ApiError shape from ErrorState component (unit — no MSW)', () => {
  it('ErrorState displays message and retry for a manually-constructed ApiError', () => {
    const apiError: ApiError = {
      status: 0,
      message: 'Network error. Please check your connection.',
    }
    const onRetry = vi.fn()

    render(<ErrorState error={apiError} onRetry={onRetry} />)

    expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
