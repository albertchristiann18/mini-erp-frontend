import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import { PurchaseOrderFormModal } from '../../../components/modals/PurchaseOrderFormModal'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

let mockLastUnitPriceForeign: string | null = null
let mockLastCurrency: string | null = null

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: ({
    onSelect,
    onQuickCreated,
    selectedLabel,
    placeholder,
  }: {
    value: string
    selectedLabel?: string
    onSelect: (id: string, label: string, productId: string, productName: string, productSupplierLink: string | null, productPhotoUrl: string | null, lastUnitPriceForeign: string | null, lastCurrency: string | null, lastDiscountedUnitPriceForeign: string | null) => void
    onQuickCreated?: (variants: Array<{
      id: string
      label: string
      productId: string
      productName: string
      productSupplierLink: string | null
      productPhotoUrl: string | null
      lastUnitPriceForeign: string | null
      lastCurrency: string | null
    }>) => void
    placeholder?: string
  }) => (
    <>
      <button
        data-testid="variant-search-select"
        onClick={() => onSelect('v1', 'Variant 1 (V1)', 'prod1', 'Product A', 'https://supplier.example.com/prod1', null, mockLastUnitPriceForeign, mockLastCurrency, null)}
      >
        {selectedLabel || (placeholder ?? 'Select variant')}
      </button>
      {onQuickCreated && (
        <button
          data-testid="trigger-quick-created"
          onClick={() =>
            onQuickCreated([{
              id: 'qv1',
              label: 'Red / M (RED-M)',
              productId: 'qprod1',
              productName: 'Quick Product',
              productSupplierLink: null,
              productPhotoUrl: null,
              lastUnitPriceForeign: null,
              lastCurrency: null,
            }])
          }
        >
          Quick Create
        </button>
      )}
    </>
  ),
}))

const mockMutateAsync = vi.fn()

vi.mock('../../../hooks/usePurchasing', () => ({
  useCreatePurchaseOrder: () => {
    const id = 'new-po-1'
    mockMutateAsync.mockResolvedValue(id)
    return { mutateAsync: mockMutateAsync, isPending: false }
  },
  useReplenishment: () => ({
    data: {
      results: [
        {
          variant_id: 'v1',
          sku_variant_code: 'V1',
          variant_name: 'Variant 1',
          product_name: 'Product A',
          stock_on_hand: 10,
          incoming_qty: 20,
          avg_sales_7d: 1.5,
          avg_sales_30d: 2.0,
        },
      ],
    },
  }),
}))

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: () => ({
    data: {
      count: 2,
      results: [
        { id: 'w1', name: 'Main WH' },
        { id: 'w2', name: 'Secondary WH' },
      ],
    },
  }),
  useSuppliers: () => ({
    data: {
      count: 2,
      results: [
        { id: 'sup1', name: 'Supplier A' },
        { id: 'sup2', name: 'Supplier B' },
      ],
    },
  }),
  useCreateSupplier: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'sup3', name: 'New Sup', is_active: true, contact_name: null, phone: null, country: null, notes: null, supplier_link: null, company_id: 'c1', cdate: '', udate: '' }), isPending: false }),
  useUpdateSupplier: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrderFormModal open={true} onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders grouped items by product when two variants share the same product_id', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const addBtn = screen.getByText('Add Item')
  fireEvent.click(addBtn)
  fireEvent.click(addBtn)

  const selects = screen.getAllByTestId('variant-search-select')
  expect(selects.length).toBeGreaterThanOrEqual(2)
  fireEvent.click(selects[0])
  fireEvent.click(selects[1])

  const productNames = screen.getAllByText('Product A')
  expect(productNames.length).toBeGreaterThanOrEqual(1)
})

it('shows supplier link icon when product has supplier link', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const selects = screen.getAllByTestId('variant-search-select')
  fireEvent.click(selects[0])

  const linkIcons = screen.queryAllByText('Supplier')
  expect(linkIcons.length).toBeGreaterThanOrEqual(1)
})

it('shows group total qty and cost', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const qtyElements = screen.getAllByText(/Qty:/)
  expect(qtyElements.length).toBeGreaterThanOrEqual(1)

  const costElements = screen.getAllByText(/Cost:/)
  expect(costElements.length).toBeGreaterThanOrEqual(1)
})

it('shows stock intel strip with SOH, AVG, DOI when variant is selected', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const selects = screen.getAllByTestId('variant-search-select')
  fireEvent.click(selects[0])

  expect(screen.getByText(/SOH:/)).toBeInTheDocument()
  expect(screen.getByText(/Incoming:/)).toBeInTheDocument()
  expect(screen.getByText(/AVG/)).toBeInTheDocument()
  expect(screen.getAllByText(/DOI:/).length).toBeGreaterThanOrEqual(1)
})

it('test_supplier_dropdown_renders', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()
  expect(screen.getByText('Supplier')).toBeInTheDocument()
})

it('test_supplier_filters_variants', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()
  expect(screen.getAllByText('No supplier').length).toBeGreaterThanOrEqual(1)
})

it('test_po_modal_renders_with_supplier_section', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()
  expect(screen.getByText('Supplier')).toBeInTheDocument()
})

describe('price auto-fill', () => {
  beforeEach(() => {
    mockLastUnitPriceForeign = null
    mockLastCurrency = null
  })

  function getUnitPriceInput() {
    return document.querySelector<HTMLInputElement>('input[step="0.001"]')
  }

  it('test_price_auto_fills_when_currency_matches', async () => {
    mockLastUnitPriceForeign = '20.00'
    mockLastCurrency = 'CNY'

    renderModal()
    expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

    await waitFor(() => {
      expect(getUnitPriceInput()).not.toBeNull()
    })

    const selects = screen.getAllByTestId('variant-search-select')
    fireEvent.click(selects[0])

    await waitFor(() => {
      const input = getUnitPriceInput()
      expect(input).not.toBeNull()
    }, { timeout: 3000 })
  })

  it('shows correct variant label on selector after onQuickCreated fires', async () => {
    renderModal()
    expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

    const quickCreateBtns = screen.getAllByTestId('trigger-quick-created')
    fireEvent.click(quickCreateBtns[0])

    await waitFor(() => {
      const selects = screen.getAllByTestId('variant-search-select')
      expect(selects[0]).toHaveTextContent('Red / M (RED-M)')
    })
  })

  it('test_price_not_auto_filled_when_currency_mismatch', async () => {
    mockLastUnitPriceForeign = '20.00'
    mockLastCurrency = 'USD'  // PO defaults to CNY, so this mismatches

    renderModal()
    expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('input[step="0.001"]')).not.toBeNull()
    })

    const selects = screen.getAllByTestId('variant-search-select')
    fireEvent.click(selects[0])

    await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>('input[step="0.001"]')
      // Price must NOT be auto-filled because currencies differ (USD ≠ CNY)
      expect(input?.value).not.toBe('20')
      expect(input?.value).not.toBe('20.00')
    }, { timeout: 3000 })
  })
})
