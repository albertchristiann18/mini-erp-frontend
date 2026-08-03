import { setupServer } from 'msw/node'

/**
 * Shared MSW server instance for integration tests.
 *
 * Usage:
 *   import { server } from '../../test/mswServer'
 *   import { http, HttpResponse } from 'msw'
 *
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 *   afterEach(() => server.resetHandlers())
 *   afterAll(() => server.close())
 *
 *   server.use(http.get('/api/endpoint', () => HttpResponse.json({ ... })))
 */
export const server = setupServer()
