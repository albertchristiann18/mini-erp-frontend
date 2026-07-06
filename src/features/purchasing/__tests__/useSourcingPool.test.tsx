import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import { useSourcingPoolItems } from '../hooks/useSourcingPool'
import { getSourcingPoolItems } from '../../../api/purchasing'
import type { AxiosResponse } from 'axios'
import type { SourcingPoolItem, SourcingPoolItemsResponse } from '../../../types/purchasing'

vi.mock('../../../api/purchasing', () => ({
  getSourcingPoolItems: vi.fn(),
  getPurchaseOrders: vi.fn(),
  getPurchaseOrder: vi.fn(),
  createPurchaseOrder: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  advancePOStatus: vi.fn(),
  checkPOTransition: vi.fn(),
  getReplenishment: vi.fn(),
  getPurchaseOrderSummary: vi.fn(),
  downloadSourcingPoolTemplate: vi.fn(),
  previewSourcingPoolUpload: vi.fn(),
  importSourcingPoolRows: vi.fn(),
  getColorAbbreviations: vi.fn(),
  upsertColorAbbreviation: vi.fn(),
  deleteColorAbbreviation: vi.fn(),
  addPoolItemsToPo: vi.fn(),
  resolveSkuConflicts: vi.fn(),
}))

const mockedGetSourcingPoolItems = vi.mocked(getSourcingPoolItems)

beforeEach(() => {
  mockedGetSourcingPoolItems.mockReset()
})

function TestComponent({ supplierId }: { supplierId: string | undefined }) {
  const { data } = useSourcingPoolItems(supplierId)
  return (
    <div>
      <span data-testid="pool-id">{data?.pool_id ?? 'null'}</span>
      <span data-testid="items-count">{data?.items.length ?? 0}</span>
    </div>
  )
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

it('returns items array from paginated results shape when pool exists', async () => {
  mockedGetSourcingPoolItems.mockResolvedValue({
    data: {
      pool_id: 'p1',
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 'item1', product_name: 'P1', variant_name: 'V1', unit_price: '10', category_id: null, category_name: null, category_code: null, discounted_price: null, qty_suggested: null, supplier_link: null, image_url: null, image_proxy_url: null, image_download_status: 'DONE' as const, notes: null, times_ordered: 0, cdate: '', udate: '', variant_id: null, variant_code: null } as SourcingPoolItem,
        { id: 'item2', product_name: 'P2', variant_name: 'V2', unit_price: '20', category_id: null, category_name: null, category_code: null, discounted_price: null, qty_suggested: null, supplier_link: null, image_url: null, image_proxy_url: null, image_download_status: 'DONE' as const, notes: null, times_ordered: 0, cdate: '', udate: '', variant_id: null, variant_code: null } as SourcingPoolItem,
      ],
    },
  } as unknown as AxiosResponse<SourcingPoolItemsResponse>)
  renderWithQuery(<TestComponent supplierId="sup1" />)
  await waitFor(() => {
    expect(screen.getByTestId('items-count').textContent).toBe('2')
    expect(screen.getByTestId('pool-id').textContent).toBe('p1')
  })
})

it('returns empty items array from items shape when no pool exists', async () => {
  mockedGetSourcingPoolItems.mockResolvedValue({
    data: { pool_id: null, items: [] },
  } as unknown as AxiosResponse<SourcingPoolItemsResponse>)
  renderWithQuery(<TestComponent supplierId="sup1" />)
  await waitFor(() => {
    expect(screen.getByTestId('items-count').textContent).toBe('0')
    expect(screen.getByTestId('pool-id').textContent).toBe('null')
  })
})
