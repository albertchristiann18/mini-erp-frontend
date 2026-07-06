import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import { BrowsePoolModal } from '../components/BrowsePoolModal'
import type { SourcingPoolItem } from '../../../types/purchasing'

const mockItems = [
  { id: 'item1', product_name: 'Widget', variant_name: 'Red', unit_price: '10', variant_code: null,
    dim1_key: null, dim1_value: null, dim2_key: null, dim2_value: null, qty_suggested: 5,
    supplier_link: null, is_used: false, is_active: true, category_id: null, category_name: null,
    category_code: null, discounted_price: null, image_url: null, image_proxy_url: null,
    image_download_status: 'DONE' as const, notes: null, times_ordered: 0, cdate: '', udate: '',
    variant_id: null, product_name_derived: undefined } as SourcingPoolItem,
  { id: 'item2', product_name: 'Widget', variant_name: 'Blue', unit_price: '12', variant_code: null,
    dim1_key: null, dim1_value: null, dim2_key: null, dim2_value: null, qty_suggested: 3,
    supplier_link: null, is_used: false, is_active: true, category_id: null, category_name: null,
    category_code: null, discounted_price: null, image_url: null, image_proxy_url: null,
    image_download_status: 'DONE' as const, notes: null, times_ordered: 0, cdate: '', udate: '',
    variant_id: null, product_name_derived: undefined } as SourcingPoolItem,
]

vi.mock('../hooks/useSourcingPool', () => ({
  useSourcingPoolItems: vi.fn(() => ({ data: { pool_id: 'p1', items: mockItems }, isLoading: false, isError: false })),
  useAddPoolItemsToPo: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useResolveSkuConflicts: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from '../../../lib/toast'
import { useSourcingPoolItems, useAddPoolItemsToPo, useResolveSkuConflicts } from '../hooks/useSourcingPool'

function renderModal(props?: Partial<{ open: boolean }>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BrowsePoolModal open={props?.open ?? true} onClose={vi.fn()} poId="po-1" supplierId="sup-1" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function goToPreview() {
  await waitFor(() => {
    expect(screen.getByText('Preview →')).toBeEnabled()
  })
  await userEvent.click(screen.getByText('Preview →'))
  await waitFor(() => {
    expect(screen.getByText('Confirm & Add to PO')).toBeInTheDocument()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders_browse_view_with_items', async () => {
  renderModal()
  await waitFor(() => {
    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
  })
})

it('item_checkbox_toggles_selection', async () => {
  renderModal()
  await waitFor(() => {
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  const checkboxes = screen.getAllByRole('checkbox')
  await userEvent.click(checkboxes[0])
  expect(screen.getByText('1 selected')).toBeInTheDocument()

  await userEvent.click(checkboxes[0])
  expect(screen.getByText('2 selected')).toBeInTheDocument()
})

it('pre_selects_all_items_on_first_load', async () => {
  renderModal()
  await waitFor(() => {
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })
  const checkboxes = screen.getAllByRole('checkbox')
  checkboxes.forEach(cb => expect(cb).toBeChecked())
})

it('pre_select_does_not_re_trigger_after_add_mutation', async () => {
  const { rerender } = renderModal()

  // Wait for pre-select to fire (items load → useEffect → all selected)
  await waitFor(() => {
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  // Manually deselect one item
  const checkboxes = screen.getAllByRole('checkbox')
  await userEvent.click(checkboxes[0])
  expect(screen.getByText('1 selected')).toBeInTheDocument()

  // Simulate a pool data re-fetch by re-rendering with fresh mock data
  // (same items, new object reference — mimics TanStack Query cache invalidation)
  const freshItems = [...mockItems]
  vi.mocked(useSourcingPoolItems).mockReturnValue({
    data: { pool_id: 'p1', items: freshItems }, isLoading: false, isError: false,
  } as unknown as ReturnType<typeof useSourcingPoolItems>)
  rerender(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <BrowsePoolModal open onClose={vi.fn()} poId="po-1" supplierId="sup-1" />
      </MemoryRouter>
    </QueryClientProvider>
  )

  // hasPreSelected.current is true — effect should NOT re-fire
  // Selection should remain at 1, not reset to 2
  await waitFor(() => {
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })
})

it('preview_button_disabled_when_nothing_selected', async () => {
  renderModal()
  await waitFor(() => {
    expect(screen.getByText('Deselect all')).toBeInTheDocument()
  })
  await userEvent.click(screen.getByText('Deselect all'))
  expect(screen.getByText('Preview →')).toBeDisabled()
})

it('preview_button_navigates_to_preview_view', async () => {
  renderModal()
  await waitFor(() => {
    expect(screen.getByText('Preview →')).toBeEnabled()
  })
  await userEvent.click(screen.getByText('Preview →'))
  await waitFor(() => {
    expect(screen.getByText('Preview — Items to Add')).toBeInTheDocument()
  })
})

it('confirm_add_calls_addPoolItemsToPo', async () => {
  const mockMutate = vi.fn()
  vi.mocked(useAddPoolItemsToPo).mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  expect(mockMutate).toHaveBeenCalledWith(
    expect.objectContaining({ poId: 'po-1', data: expect.objectContaining({ item_ids: expect.arrayContaining(['item1', 'item2']) }) }),
    expect.any(Object),
  )
})

it('add_with_no_conflicts_goes_to_result', async () => {
  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onSuccess?.({ added: [{ item_id: 'item1', po_detail_id: 'pd-1', product_name: 'Widget', variant_name: 'Red' }], skipped: [], sku_conflicts: [] })
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(screen.getByText('1 item added to PO')).toBeInTheDocument()
  })
})

it('add_with_sku_conflicts_goes_to_resolve_view', async () => {
  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onSuccess?.({ added: [], skipped: [], sku_conflicts: [{ item_id: 'item1', variant_code: 'WID-RED', sku_code: 'WID-RED', existing_product_id: 'p1', existing_product_name: 'Old Widget' }] })
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(screen.getByText('SKU Conflicts')).toBeInTheDocument()
  })
})

it('resolve_view_shows_conflict_list', async () => {
  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onSuccess?.({ added: [], skipped: [], sku_conflicts: [{ item_id: 'item1', variant_code: 'WID-RED', sku_code: 'WID-RED', existing_product_id: 'p1', existing_product_name: 'Old Widget' }] })
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(screen.getByText('WID-RED')).toBeInTheDocument()
    expect(screen.getByText(/Add to/)).toBeInTheDocument()
    expect(screen.getByText('Skip')).toBeInTheDocument()
  })
})

it('resolve_confirm_button_calls_resolve_mutation', async () => {
  const resolveMutate = vi.fn()

  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onSuccess?.({ added: [], skipped: [], sku_conflicts: [{ item_id: 'item1', variant_code: 'WID-RED', sku_code: 'WID-RED', existing_product_id: 'p1', existing_product_name: 'Old Widget' }] })
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)
  vi.mocked(useResolveSkuConflicts).mockReturnValue({ mutate: resolveMutate, isPending: false } as unknown as ReturnType<typeof useResolveSkuConflicts>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })
  await userEvent.click(screen.getByText('Confirm'))
  expect(resolveMutate).toHaveBeenCalled()
})

it('result_view_toast_shown_after_add', async () => {
  vi.mocked(toast.success).mockClear()

  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onSuccess?.({ added: [{ item_id: 'item1', po_detail_id: 'pd-1', product_name: 'Widget', variant_name: 'Red' }], skipped: [], sku_conflicts: [] })
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(vi.mocked(toast.success)).toHaveBeenCalled()
  })
})

it('result_view_shows_total_added', async () => {
  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onSuccess?.({ added: [{ item_id: 'item1', po_detail_id: 'pd-1', product_name: 'Widget', variant_name: 'Red' }, { item_id: 'item2', po_detail_id: 'pd-2', product_name: 'Widget', variant_name: 'Blue' }], skipped: [], sku_conflicts: [] })
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(screen.getByText('2 items added to PO')).toBeInTheDocument()
  })
})

it('shows_error_state_when_pool_load_fails', async () => {
  vi.mocked(useSourcingPoolItems).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
  } as unknown as ReturnType<typeof useSourcingPoolItems>)

  renderModal()

  await waitFor(() => {
    expect(screen.getByText('Failed to load sourcing pool')).toBeInTheDocument()
  })
})

it('shows_error_toast_when_add_fails', async () => {
  vi.mocked(useSourcingPoolItems).mockReturnValue({
    data: { pool_id: 'p1', items: mockItems },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useSourcingPoolItems>)
  vi.mocked(useAddPoolItemsToPo).mockReturnValue({
    mutate: vi.fn((_opts, callbacks) => {
      callbacks?.onError?.()
    }),
    isPending: false,
  } as unknown as ReturnType<typeof useAddPoolItemsToPo>)

  renderModal()
  await goToPreview()
  await userEvent.click(screen.getByText('Confirm & Add to PO'))

  await waitFor(() => {
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to add items to PO. Please try again.')
  })
})

it('empty_pool_shows_empty_state', async () => {
  vi.mocked(useSourcingPoolItems).mockReturnValue({ data: { pool_id: null, items: [] }, isLoading: false, isError: false } as unknown as ReturnType<typeof useSourcingPoolItems>)

  renderModal()
  await waitFor(() => {
    expect(screen.getByText('No available pool items for this supplier.')).toBeInTheDocument()
  })
})
