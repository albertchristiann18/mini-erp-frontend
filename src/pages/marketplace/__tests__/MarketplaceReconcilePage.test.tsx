import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import MarketplaceReconcilePage from '../MarketplaceReconcilePage'

vi.mock('../../../hooks/api/inventory', () => ({
  useWarehouses: vi.fn(),
  useCompanyMarketplaces: vi.fn(),
}))

vi.mock('../../../hooks/api/useMarketplace', () => ({
  useMarketplaceReconcileStock: vi.fn(),
}))

import { useWarehouses, useCompanyMarketplaces } from '../../../hooks/api/inventory'
import { useMarketplaceReconcileStock } from '../../../hooks/api/useMarketplace'

const mockMarketplaces = {
  results: [
    { id: 'm1', name: 'Shopee', company_id: 'c1', is_active: true, cdate: '', udate: '' },
    { id: 'm2', name: 'TikTok', company_id: 'c1', is_active: true, cdate: '', udate: '' },
  ],
  count: 2, next: null, previous: null,
}

const mockWarehouses = {
  results: [
    { id: 'w1', name: 'Warehouse A', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 1, next: null, previous: null,
}

const mockPreviewResult = {
  reconciled: [
    { sku: 'SKU001', variant_id: 'v1', before: 10, after: 15, delta: 5 },
    { sku: 'SKU002', variant_id: 'v2', before: 20, after: 10, delta: -10 },
  ],
  skipped: [{ sku: 'SKU003', qty: 5 }],
  not_found: ['SKU999', 'SKU888'],
  errors: [],
  summary: { total: 5, reconciled: 2, skipped: 1, not_found: 2 },
  dry_run: true,
}

const mockConfirmResult = {
  reconciled: [
    { sku: 'SKU001', variant_id: 'v1', before: 10, after: 15, delta: 5 },
  ],
  skipped: [{ sku: 'SKU003', qty: 5 }],
  not_found: ['SKU999'],
  errors: [],
  summary: { total: 4, reconciled: 1, skipped: 1, not_found: 1 },
  dry_run: false,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MarketplaceReconcilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never

function selectWarehouse() {
  const comboboxes = screen.getAllByRole('combobox')
  const warehouseCombobox = comboboxes[1]
  fireEvent.click(warehouseCombobox)
  fireEvent.click(screen.getByRole('option', { name: /warehouse a/i }))
}

function attachFile() {
  const file = new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const input = screen.getByLabelText(/export file/i) as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

function goToPreview() {
  selectWarehouse()
  attachFile()
}

it('renders step 1 with marketplace select, warehouse select, file input, preview button', () => {
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useCompanyMarketplaces).mockReturnValue(hookResult(mockMarketplaces))
  vi.mocked(useMarketplaceReconcileStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  expect(screen.getByText('Marketplace (optional)')).toBeInTheDocument()
  expect(screen.getByText('Warehouse')).toBeInTheDocument()
  expect(screen.getByText('Export File (.xlsx)')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /preview changes/i })).toBeInTheDocument()
})

it('preview button disabled when no file or no warehouse selected', () => {
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useCompanyMarketplaces).mockReturnValue(hookResult(mockMarketplaces))
  vi.mocked(useMarketplaceReconcileStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const previewBtn = screen.getByRole('button', { name: /preview changes/i })
  expect(previewBtn).toBeDisabled()
})

it('after preview shows step 2 with reconciled count', async () => {
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useCompanyMarketplaces).mockReturnValue(hookResult(mockMarketplaces))
  vi.mocked(useMarketplaceReconcileStock).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(mockPreviewResult), isPending: false } as never)
  renderPage()

  goToPreview()

  await userEvent.click(screen.getByRole('button', { name: /preview changes/i }))

  expect(await screen.findByText('Will adjust')).toBeInTheDocument()
  expect(screen.getByText('Confirm & Apply')).toBeInTheDocument()
})

it('Back from preview returns to step 1', async () => {
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useCompanyMarketplaces).mockReturnValue(hookResult(mockMarketplaces))
  vi.mocked(useMarketplaceReconcileStock).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(mockPreviewResult), isPending: false } as never)
  renderPage()

  goToPreview()

  await userEvent.click(screen.getByRole('button', { name: /preview changes/i }))
  expect(await screen.findByText('Confirm & Apply')).toBeInTheDocument()

  const backButtons = screen.getAllByRole('button', { name: /^back$/i })
  await userEvent.click(backButtons[backButtons.length - 1])

  expect(screen.getByRole('button', { name: /preview changes/i })).toBeInTheDocument()
})

it('Confirm & Apply submits with dry_run=false and moves to step 3', async () => {
  const mutateAsync = vi.fn()
    .mockResolvedValueOnce(mockPreviewResult)
    .mockResolvedValueOnce(mockConfirmResult)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useCompanyMarketplaces).mockReturnValue(hookResult(mockMarketplaces))
  vi.mocked(useMarketplaceReconcileStock).mockReturnValue({ mutateAsync, isPending: false } as never)
  renderPage()

  goToPreview()

  await userEvent.click(screen.getByRole('button', { name: /preview changes/i }))
  expect(await screen.findByText('Confirm & Apply')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /confirm & apply/i }))

  expect(await screen.findByText('Reconciliation complete')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reconcile another file/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /back to stock/i })).toBeInTheDocument()
})

it('step 3 shows reconciliation complete message', async () => {
  const mutateAsync = vi.fn()
    .mockResolvedValueOnce(mockPreviewResult)
    .mockResolvedValueOnce(mockConfirmResult)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useCompanyMarketplaces).mockReturnValue(hookResult(mockMarketplaces))
  vi.mocked(useMarketplaceReconcileStock).mockReturnValue({ mutateAsync, isPending: false } as never)
  renderPage()

  goToPreview()

  await userEvent.click(screen.getByRole('button', { name: /preview changes/i }))
  expect(await screen.findByText('Confirm & Apply')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /confirm & apply/i }))

  expect(await screen.findByText('Reconciliation complete')).toBeInTheDocument()
  expect(screen.getByText(/reconciled: 1 variants adjusted/i)).toBeInTheDocument()
  expect(screen.getByText(/skipped: 1 variants unchanged/i)).toBeInTheDocument()
  expect(screen.getByText(/not found: 1 skus unmatched/i)).toBeInTheDocument()
})
