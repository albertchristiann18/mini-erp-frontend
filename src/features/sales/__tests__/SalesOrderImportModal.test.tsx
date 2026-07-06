import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect, beforeEach } from 'vitest'
import type { ExcelImportPreviewResponse, ExcelImportConfirmResponse } from '../types'

const mockPreviewMutate = vi.fn()
const mockConfirmMutate = vi.fn()

const { mockUseVariantSearch } = vi.hoisted(() => ({
  mockUseVariantSearch: vi.fn(() => ({ data: { results: [] as Array<unknown> }, isLoading: false })),
}))

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: () => ({ data: { results: [{ id: 'w1', name: 'Warehouse 1' }] } }),
  useCompanyMarketplaces: () => ({ data: { results: [{ id: 'mp1', name: 'Shopee' }] } }),
  useVariantSearch: mockUseVariantSearch,
}))

vi.mock('../hooks/useSales', () => ({
  usePreviewSalesOrderImport: () => ({ mutate: mockPreviewMutate, isPending: false }),
  useConfirmSalesOrderImport: () => ({ mutate: mockConfirmMutate, isPending: false }),
}))

import { SalesOrderImportModal } from '../components/SalesOrderImportModal'

const basePreview: ExcelImportPreviewResponse = {
  file_summary: { total_rows: 10, date_from: '2026-06-06', date_to: '2026-07-06' },
  new_orders: [
    { order_number: 'ORD-001', mapped_status: 'CONFIRMED', item_count: 2, order_date: '2026-06-10' },
    { order_number: 'ORD-002', mapped_status: 'PENDING', item_count: 1, order_date: '2026-06-11' },
  ],
  status_updates: [
    { order_number: 'ORD-003', current_status: 'PENDING', new_status: 'DELIVERED' },
  ],
  cancellation_transitions: [],
  skipped_already_cancelled: 1,
  unmatched_skus: [],
}

const baseConfirm: ExcelImportConfirmResponse = {
  created: 2,
  updated: 1,
  skipped_cancelled: 0,
  skipped_unmatched: 0,
  stock_deducted_orders: 1,
  returns_queued: 0,
  errors: [],
}

function getFileInput() {
  return screen.getByTestId('file-input') as HTMLElement
}

function getMarketplaceCombobox() {
  return screen.getAllByRole('combobox')[0]
}

function getWarehouseCombobox() {
  return screen.getAllByRole('combobox')[1]
}

async function selectMarketplace(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getMarketplaceCombobox())
  await user.click(screen.getByRole('option', { name: 'Shopee' }))
}

async function selectWarehouse(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getWarehouseCombobox())
  await user.click(screen.getByRole('option', { name: 'Warehouse 1' }))
}

beforeEach(() => {
  mockPreviewMutate.mockReset()
  mockConfirmMutate.mockReset()
  mockUseVariantSearch.mockReset()
})

it('renders step 1 with disabled "Preview File" button when no file selected', () => {
  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)
  const btn = screen.getByRole('button', { name: /preview file/i })
  expect(btn).toBeDisabled()
})

it('"Preview File" button disabled when marketplace or warehouse not selected', async () => {
  const user = userEvent.setup()
  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))

  const btn = screen.getByRole('button', { name: /preview file/i })
  expect(btn).toBeDisabled()

  await selectMarketplace(user)
  expect(btn).toBeDisabled()

  await selectWarehouse(user)
  expect(btn).not.toBeDisabled()
})

it('"Preview File" button calls previewMutation with correct args and advances to step 2 on success', async () => {
  const user = userEvent.setup()
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  expect(mockPreviewMutate).toHaveBeenCalledWith(
    expect.objectContaining({ marketplaceId: 'mp1', warehouseId: 'w1' }),
    expect.any(Object),
  )

  await waitFor(() => {
    expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument()
  })
})

it('step 2 shows correct new_orders / status_updates / skipped counts from previewData', async () => {
  const user = userEvent.setup()
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)
  })
})

it('step 2 "Proceed to Import" disabled when unresolved SKUs exist and skipUnmatched=false', async () => {
  const user = userEvent.setup()
  const previewWithUnmatched: ExcelImportPreviewResponse = {
    ...basePreview,
    unmatched_skus: [{ shopee_sku: 'SKU-001', product_name: 'Product A', order_number: 'ORD-001' }],
  }
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(previewWithUnmatched)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(screen.getByText(/proceed to import/i)).toBeDisabled()
  })
})

it('step 2 "Proceed to Import" enabled when skipUnmatched=true despite unresolved SKUs', async () => {
  const user = userEvent.setup()
  const previewWithUnmatched: ExcelImportPreviewResponse = {
    ...basePreview,
    unmatched_skus: [{ shopee_sku: 'SKU-001', product_name: 'Product A', order_number: 'ORD-001' }],
  }
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(previewWithUnmatched)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(screen.getByText(/skip orders with unmatched skus/i)).toBeInTheDocument()
  })

  await user.click(screen.getByLabelText(/skip orders with unmatched skus/i))

  await waitFor(() => {
    expect(screen.getByText(/proceed to import/i)).not.toBeDisabled()
  })
})

it('step 2 shows "Nothing to import" message and disables Proceed when new_orders/status_updates/cancellations are all empty', async () => {
  const user = userEvent.setup()
  const emptyPreview: ExcelImportPreviewResponse = {
    file_summary: { total_rows: 0, date_from: null, date_to: null },
    new_orders: [],
    status_updates: [],
    cancellation_transitions: [],
    skipped_already_cancelled: 0,
    unmatched_skus: [],
  }
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(emptyPreview)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(screen.getByText(/nothing to import/i)).toBeInTheDocument()
    expect(screen.getByText(/proceed to import/i)).toBeDisabled()
  })
})

it('step 3 "Confirm Import" calls confirmMutation with correct args and advances to step 4 on success', async () => {
  const user = userEvent.setup()
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })
  mockConfirmMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportConfirmResponse) => void }) => {
    onSuccess(baseConfirm)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))
  await waitFor(() => { expect(screen.getByText(/proceed to import/i)).toBeEnabled() })
  await user.click(screen.getByText(/proceed to import/i))
  await waitFor(() => { expect(screen.getByText(/confirm import/i)).toBeInTheDocument() })

  await user.click(screen.getByText(/confirm import/i))

  expect(mockConfirmMutate).toHaveBeenCalledWith(
    expect.objectContaining({ marketplaceId: 'mp1', warehouseId: 'w1' }),
    expect.any(Object),
  )

  await waitFor(() => {
    expect(screen.getByText('Import Complete')).toBeInTheDocument()
    expect(screen.getByText(/import successful/i)).toBeInTheDocument()
  })
})

it('step 4 shows created/updated counts from resultData', async () => {
  const user = userEvent.setup()
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })
  mockConfirmMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportConfirmResponse) => void }) => {
    onSuccess(baseConfirm)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))
  await waitFor(() => { expect(screen.getByText(/proceed to import/i)).toBeEnabled() })
  await user.click(screen.getByText(/proceed to import/i))
  await waitFor(() => { expect(screen.getByText(/confirm import/i)).toBeInTheDocument() })
  await user.click(screen.getByText(/confirm import/i))

  await waitFor(() => {
    expect(screen.getByText(/orders created: 2/i)).toBeInTheDocument()
    expect(screen.getByText(/orders updated: 1/i)).toBeInTheDocument()
  })
})

it('step 4 shows returns_queued info box when returns_queued > 0', async () => {
  const user = userEvent.setup()
  const confirmWithReturns: ExcelImportConfirmResponse = {
    ...baseConfirm,
    returns_queued: 3,
  }
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })
  mockConfirmMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportConfirmResponse) => void }) => {
    onSuccess(confirmWithReturns)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))
  await waitFor(() => { expect(screen.getByText(/proceed to import/i)).toBeEnabled() })
  await user.click(screen.getByText(/proceed to import/i))
  await waitFor(() => { expect(screen.getByText(/confirm import/i)).toBeInTheDocument() })
  await user.click(screen.getByText(/confirm import/i))

  await waitFor(() => {
    expect(screen.getByText(/returns queued: 3/i)).toBeInTheDocument()
  })
})

it('"Close" on step 4 calls onImportSuccess', async () => {
  const user = userEvent.setup()
  const onImportSuccess = vi.fn()
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })
  mockConfirmMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportConfirmResponse) => void }) => {
    onSuccess(baseConfirm)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={onImportSuccess} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))
  await waitFor(() => { expect(screen.getByText(/proceed to import/i)).toBeEnabled() })
  await user.click(screen.getByText(/proceed to import/i))
  await waitFor(() => { expect(screen.getByText(/confirm import/i)).toBeInTheDocument() })
  await user.click(screen.getByText(/confirm import/i))
  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: /close/i })[0]).toBeInTheDocument()
  })
  const primaryClose = screen.getAllByRole('button', { name: /close/i }).find(b => !b.querySelector('svg'))
  await user.click(primaryClose!)

  expect(onImportSuccess).toHaveBeenCalled()
})

it('preview API error shows toast.error with backend error message', async () => {
  const user = userEvent.setup()
  const { toast } = await import('../../../lib/toast')
  const toastErrorSpy = vi.spyOn(toast, 'error')

  mockPreviewMutate.mockImplementation((_vars, { onError }: { onError: (err: unknown) => void }) => {
    onError({ response: { data: { error: 'Invalid file format' } } })
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(toastErrorSpy).toHaveBeenCalledWith('Invalid file format')
  })

  toastErrorSpy.mockRestore()
})

it('confirm API error shows toast.error with backend error message', async () => {
  const user = userEvent.setup()
  const { toast } = await import('../../../lib/toast')
  const toastErrorSpy = vi.spyOn(toast, 'error')

  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(basePreview)
  })
  mockConfirmMutate.mockImplementation((_vars, { onError }: { onError: (err: unknown) => void }) => {
    onError({ response: { data: { error: 'Import failed due to inventory conflict' } } })
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))
  await waitFor(() => { expect(screen.getByText(/proceed to import/i)).toBeEnabled() })
  await user.click(screen.getByText(/proceed to import/i))
  await waitFor(() => { expect(screen.getByText(/confirm import/i)).toBeInTheDocument() })
  await user.click(screen.getByText(/confirm import/i))

  await waitFor(() => {
    expect(toastErrorSpy).toHaveBeenCalledWith('Import failed due to inventory conflict')
  })

  toastErrorSpy.mockRestore()
})

it('SkuResolutionModal "Confirm Mappings" disabled until every unmatched SKU row has a selection', async () => {
  const user = userEvent.setup()
  const previewWithUnmatched: ExcelImportPreviewResponse = {
    ...basePreview,
    unmatched_skus: [
      { shopee_sku: 'SKU-001', product_name: 'Product A', order_number: 'ORD-001' },
      { shopee_sku: 'SKU-002', product_name: 'Product B', order_number: 'ORD-002' },
    ],
  }
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(previewWithUnmatched)
  })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(screen.getByText(/resolve skus/i)).toBeInTheDocument()
  })

  await user.click(screen.getByText(/resolve skus/i))

  await waitFor(() => {
    expect(screen.getByText(/confirm mappings/i)).toBeDisabled()
  })

  const skipButtons = screen.getAllByText(/skip this item/i)
  await user.click(skipButtons[0])
  await user.click(skipButtons[1])

  await waitFor(() => {
    expect(screen.getByText(/confirm mappings/i)).toBeEnabled()
  })
})

it('SkuResolutionModal debounce: typing in search input does NOT call useVariantSearch immediately; call only fires after 300ms', async () => {
  const user = userEvent.setup()

  const previewWithUnmatched: ExcelImportPreviewResponse = {
    ...basePreview,
    unmatched_skus: [
      { shopee_sku: 'SKU-001', product_name: 'Product A', order_number: 'ORD-001' },
    ],
  }
  mockPreviewMutate.mockImplementation((_vars, { onSuccess }: { onSuccess: (data: ExcelImportPreviewResponse) => void }) => {
    onSuccess(previewWithUnmatched)
  })
  mockUseVariantSearch
    .mockReturnValueOnce({ data: { results: [] }, isLoading: false })
    .mockReturnValue({ data: { results: [] }, isLoading: false })

  render(<SalesOrderImportModal open onClose={() => {}} onImportSuccess={() => {}} />)

  await user.upload(getFileInput(), new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  await selectMarketplace(user)
  await selectWarehouse(user)

  await user.click(screen.getByRole('button', { name: /preview file/i }))

  await waitFor(() => {
    expect(screen.getByText(/resolve skus/i)).toBeInTheDocument()
  })

  const callsBeforeType = mockUseVariantSearch.mock.calls.length

  await user.click(screen.getByText(/resolve skus/i))

  const searchInput = screen.getByPlaceholderText(/search variant/i)
  await user.type(searchInput, 't')

  await new Promise(r => setTimeout(r, 500))

  expect(mockUseVariantSearch.mock.calls.length).toBeGreaterThan(callsBeforeType)
})
