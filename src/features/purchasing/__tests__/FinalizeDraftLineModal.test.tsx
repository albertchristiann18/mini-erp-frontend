import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, beforeEach } from 'vitest'
import { FinalizeDraftLineModal } from '../components/FinalizeDraftLineModal'
import * as useSourcingPoolModule from '../hooks/useSourcingPool'
import type { PurchaseOrderDetail } from '../../../types/purchasing'

vi.mock('../hooks/useSourcingPool', () => ({
  useFinalizeDraftLine: vi.fn(),
}))
vi.mock('../../../hooks/useInventory', () => ({
  useCategories: () => ({ data: { results: [{ id: 'c1', name: 'Electronics', category_code: 'ELE' }] } }),
}))
vi.mock('../../../lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockDetail: PurchaseOrderDetail = {
  id: 'd1',
  is_draft: true,
  draft_product_name: 'Widget A Red',
  product_name: 'Widget A',
  product_variant_name: 'Red',
  product_supplier_link: null,
  product_photo_url: null,
  ordered_qty: 50,
  unit_price_foreign: '15.00',
  discounted_unit_price_foreign: null,
  variant_id: '',
  product_id: '',
  received_qty: 0,
  unit_price_base: null,
  discounted_unit_price_base: null,
  total_price_foreign: null,
  total_price_base: null,
  discounted_total_price_foreign: null,
  discounted_total_price_base: null,
  remarks: '',
  avg_sales: null,
  avg_sales_7d: null,
  stock_on_hand: 0,
  incoming_qty: 0,
  variant_values: {},
  last_unit_price_foreign: null,
  last_currency: null,
  last_discounted_unit_price_foreign: null,
  shipping_per_unit_idr: null,
  delivery_per_unit_idr: null,
  commission_per_unit_idr: null,
  cogs_per_unit_idr: null,
  product_has_dimensions: null,
  sourcing_item_id: null,
  product_dim1_key: null,
}

const mockedUseFinalizeDraftLine = vi.mocked(useSourcingPoolModule.useFinalizeDraftLine)

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseFinalizeDraftLine.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ detail_id: 'd1', variant_id: 'v1' }),
    isPending: false,
    // Partial mock — useMutation return type has many internal fields not needed for testing
  } as unknown as ReturnType<typeof useSourcingPoolModule.useFinalizeDraftLine>)
})

function renderModal(props: Partial<React.ComponentProps<typeof FinalizeDraftLineModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <FinalizeDraftLineModal
        open
        onClose={vi.fn()}
        poId="po1"
        detail={mockDetail}
        {...props}
      />
    </QueryClientProvider>,
  )
}

it('renders_draft_product_name_and_qty_in_preview', () => {
  renderModal()
  expect(screen.getByText('Widget A Red')).toBeInTheDocument()
  expect(screen.getByText(/50 units/)).toBeInTheDocument()
})

it('sku_suffix_required_validation_blocks_submission', async () => {
  const user = userEvent.setup()
  renderModal()
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  expect(screen.getByRole('alert')).toHaveTextContent('SKU suffix is required')
  expect(mockedUseFinalizeDraftLine().mutateAsync).not.toHaveBeenCalled()
})

it('whitespace_only_sku_suffix_is_rejected', async () => {
  const user = userEvent.setup()
  renderModal()
  await user.type(screen.getByLabelText(/sku suffix/i), '   ')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  expect(screen.getByRole('alert')).toHaveTextContent('SKU suffix is required')
})

it('successful_finalization_calls_api_and_closes', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  renderModal({ onClose })
  await user.type(screen.getByLabelText(/sku suffix/i), 'RED-L')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  await waitFor(() => {
    expect(mockedUseFinalizeDraftLine().mutateAsync).toHaveBeenCalledWith({
      poId: 'po1',
      detailId: 'd1',
      sku_suffix: 'RED-L',
      category_id: null,
      product_name: 'Widget A Red',
    })
  })
  expect(onClose).toHaveBeenCalled()
})

it('api_error_message_shown_without_closing_modal', async () => {
  const user = userEvent.setup()
  mockedUseFinalizeDraftLine.mockReturnValue({
    mutateAsync: vi.fn().mockRejectedValue(
      Object.assign(new Error('fail'), { response: { data: { error: 'SKU already exists' } } }),
    ),
    isPending: false,
    // Partial mock — useMutation return type has many internal fields not needed for testing
  } as unknown as ReturnType<typeof useSourcingPoolModule.useFinalizeDraftLine>)
  const onClose = vi.fn()
  renderModal({ onClose })
  await user.type(screen.getByLabelText(/sku suffix/i), 'DUP')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('SKU already exists')
  })
  expect(onClose).not.toHaveBeenCalled()
})

it('category_select_sends_null_when_no_category_chosen', async () => {
  const user = userEvent.setup()
  renderModal()
  await user.type(screen.getByLabelText(/sku suffix/i), 'X')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  await waitFor(() => {
    expect(mockedUseFinalizeDraftLine().mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: null }),
    )
  })
})

it('selecting_category_sends_category_id', async () => {
  const user = userEvent.setup()
  renderModal()
  const selectTrigger = screen.getByRole('combobox')
  await user.click(selectTrigger)
  const option = await screen.findByText(/Electronics/)
  await user.click(option)
  await user.type(screen.getByLabelText(/sku suffix/i), 'X')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  await waitFor(() => {
    expect(mockedUseFinalizeDraftLine().mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'c1' }),
    )
  })
})

it('product_name_override_submitted', async () => {
  const user = userEvent.setup()
  renderModal()
  const productNameInput = screen.getByLabelText(/product name/i)
  await user.clear(productNameInput)
  await user.type(productNameInput, 'My New Product')
  await user.type(screen.getByLabelText(/sku suffix/i), 'X')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  await waitFor(() => {
    expect(mockedUseFinalizeDraftLine().mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ product_name: 'My New Product' }),
    )
  })
})

it('form_resets_when_reopened_with_different_detail', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  const { rerender } = renderModal({ open: true })
  const skuInput = screen.getByLabelText(/sku suffix/i)
  await user.type(skuInput, 'OLD')
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  rerender(
    <QueryClientProvider client={qc}>
      <FinalizeDraftLineModal
        open={false}
        onClose={onClose}
        poId="po1"
        detail={mockDetail}
      />
    </QueryClientProvider>,
  )
  const newDetail: PurchaseOrderDetail = { ...mockDetail, id: 'd2', draft_product_name: 'Widget B Blue' }
  rerender(
    <QueryClientProvider client={qc}>
      <FinalizeDraftLineModal
        open={true}
        onClose={onClose}
        poId="po1"
        detail={newDetail}
      />
    </QueryClientProvider>,
  )
  expect(screen.getByLabelText(/sku suffix/i)).toHaveValue('')
  expect(screen.getByLabelText(/product name/i)).toHaveValue('Widget B Blue')
})

it('unnamed_modal_shows_empty_product_name_and_requires_it', async () => {
  const user = userEvent.setup()
  const unnamedDetail: PurchaseOrderDetail = {
    ...mockDetail,
    id: 'd-unnamed',
    draft_product_name: '(Unnamed) / Red',
  }
  renderModal({ detail: unnamedDetail })
  expect(screen.getByLabelText(/product name/i)).toHaveValue('')
  expect(screen.getByText(/Product Name/i)).toBeInTheDocument()
  await user.type(screen.getByLabelText(/sku suffix/i), 'X')
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  expect(screen.getByRole('alert')).toHaveTextContent('Product name is required')
  expect(mockedUseFinalizeDraftLine().mutateAsync).not.toHaveBeenCalled()
})

it('dim_inputs_rendered_and_passed_to_mutate', async () => {
  const user = userEvent.setup()
  renderModal()
  await user.type(screen.getByLabelText(/sku suffix/i), 'X')
  await user.type(screen.getByPlaceholderText('e.g. Warna'), 'Warna')
  await user.type(screen.getByPlaceholderText('e.g. Putih'), 'Putih')
  await user.type(screen.getByPlaceholderText('e.g. Ukuran'), 'Ukuran')
  await user.type(screen.getByPlaceholderText('e.g. M'), 'M')
  await user.click(screen.getByRole('combobox'))
  const option = await screen.findByText(/Electronics/)
  await user.click(option)
  await user.click(screen.getByRole('button', { name: /finalize/i }))
  await waitFor(() => {
    expect(mockedUseFinalizeDraftLine().mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dim1_key: 'Warna',
        dim1_value: 'Putih',
        dim2_key: 'Ukuran',
        dim2_value: 'M',
      }),
    )
  })
})
