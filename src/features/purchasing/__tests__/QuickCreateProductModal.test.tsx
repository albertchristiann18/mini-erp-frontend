import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, it, expect, beforeEach } from 'vitest'
import { QuickCreateProductModal } from '../QuickCreateProductModal'

const mockCreateProduct = vi.fn()
const mockUploadProductPhoto = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useCreateProduct: () => ({ mutateAsync: mockCreateProduct, isPending: false }),
  useCategories: () => ({
    data: {
      results: [
        { id: 'cat1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
      ],
      count: 1,
    },
  }),
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { company_id: 'company-123', is_staff: true } }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../api/inventory', () => ({
  uploadProductPhoto: (...args: unknown[]) => mockUploadProductPhoto(...args),
}))

vi.mock('../../../components/ui/CategorySelect', () => ({
  CategorySelect: ({ onChange }: { onChange: (id: string) => void }) => (
    <button onClick={() => onChange('cat1')}>SelectCategory</button>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function getProductNameInput(): HTMLInputElement {
  return screen.getAllByRole('textbox')[0] as HTMLInputElement
}

it('renders form fields', () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  expect(screen.getByText('Product Name')).toBeInTheDocument()
  expect(screen.getByText('Category')).toBeInTheDocument()
  expect(screen.getByText('Supplier Link')).toBeInTheDocument()
  expect(screen.getByText('Product Photo')).toBeInTheDocument()
  expect(screen.getByText('Add Dimension')).toBeInTheDocument()
})

it('shows no dimensions message when no dimensions added', () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  expect(screen.getByText('No dimensions — a Default variant will be created automatically.')).toBeInTheDocument()
})

it('can add and remove a dimension row', () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  fireEvent.click(screen.getByText('Add Dimension'))
  expect(screen.getByPlaceholderText('e.g. color')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('e.g. Red, Blue, Green')).toBeInTheDocument()

  const xButtons = screen.getAllByRole('button').filter(b =>
    b.querySelector('svg.lucide-x')
  )
  fireEvent.click(xButtons[0])
  expect(screen.queryByPlaceholderText('e.g. color')).not.toBeInTheDocument()
})

it('validates required fields', async () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  fireEvent.click(screen.getByText('Create & Add'))
  await waitFor(() => {
    expect(screen.getByText('Product name is required')).toBeInTheDocument()
    expect(screen.getByText('Category is required')).toBeInTheDocument()
  })
})

it('validates dimension rows have name and values', async () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  fireEvent.click(screen.getByText('Add Dimension'))
  fireEvent.click(screen.getByText('Create & Add'))
  await waitFor(() => {
    expect(screen.getByText('Dimension name is required')).toBeInTheDocument()
    expect(screen.getByText('At least one value required')).toBeInTheDocument()
  })
})

it('submits with no variants when no dimensions', async () => {
  const onCreated = vi.fn()
  mockCreateProduct.mockResolvedValue({
    id: 'prod1',
    name: 'Test',
    variants: [{ id: 'v1', name: 'Default', sku_variant_code: 'SKU-DEFAULT' }],
  })

  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={onCreated} />)

  fireEvent.change(getProductNameInput(), { target: { value: 'Test Product' } })
  fireEvent.click(screen.getByText('SelectCategory'))
  fireEvent.click(screen.getByText('Create & Add'))

  await waitFor(() => {
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ variant_options: {}, variants: [] })
    )
  })

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'v1', label: 'Default (SKU-DEFAULT)' }),
    ])
  })
})

it('submits with correct dimension payload for 2 dimensions', async () => {
  mockCreateProduct.mockResolvedValue({
    id: 'prod1',
    name: 'Test',
    variants: [
      { id: 'v1', name: 'Red / S', sku_variant_code: 'RED-S' },
      { id: 'v2', name: 'Red / M', sku_variant_code: 'RED-M' },
      { id: 'v3', name: 'Blue / S', sku_variant_code: 'BLUE-S' },
      { id: 'v4', name: 'Blue / M', sku_variant_code: 'BLUE-M' },
    ],
  })

  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

  fireEvent.change(getProductNameInput(), { target: { value: 'Test' } })
  fireEvent.click(screen.getByText('SelectCategory'))

  fireEvent.click(screen.getByText('Add Dimension'))
  fireEvent.change(screen.getByPlaceholderText('e.g. color'), { target: { value: 'color' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Red, Blue, Green'), { target: { value: 'Red, Blue' } })

  fireEvent.click(screen.getByText('Add Dimension'))
  const nameInputs = screen.getAllByPlaceholderText('e.g. color')
  const valuesInputs = screen.getAllByPlaceholderText('e.g. Red, Blue, Green')
  fireEvent.change(nameInputs[1], { target: { value: 'size' } })
  fireEvent.change(valuesInputs[1], { target: { value: 'S, M' } })

  fireEvent.click(screen.getByText('Create & Add'))

  await waitFor(() => {
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_options: { color: ['Red', 'Blue'], size: ['S', 'M'] },
      })
    )
  })

  await waitFor(() => {
    const callArgs = mockCreateProduct.mock.calls[0][0]
    expect(callArgs.variants).toHaveLength(4)
    expect(callArgs.variants[0].variant_values).toEqual({ color: 'Red', size: 'S' })
    expect(callArgs.variants[1].variant_values).toEqual({ color: 'Red', size: 'M' })
    expect(callArgs.variants[2].variant_values).toEqual({ color: 'Blue', size: 'S' })
    expect(callArgs.variants[3].variant_values).toEqual({ color: 'Blue', size: 'M' })
  })
})

it('shows picker step when 2+ variants created', async () => {
  mockCreateProduct.mockResolvedValue({
    id: 'prod1',
    name: 'Test',
    variants: [
      { id: 'v1', name: 'Red / S', sku_variant_code: 'RED-S' },
      { id: 'v2', name: 'Red / M', sku_variant_code: 'RED-M' },
      { id: 'v3', name: 'Blue / S', sku_variant_code: 'BLUE-S' },
      { id: 'v4', name: 'Blue / M', sku_variant_code: 'BLUE-M' },
    ],
  })

  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

  fireEvent.change(getProductNameInput(), { target: { value: 'Test' } })
  fireEvent.click(screen.getByText('SelectCategory'))

  fireEvent.click(screen.getByText('Add Dimension'))
  fireEvent.change(screen.getByPlaceholderText('e.g. color'), { target: { value: 'color' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Red, Blue, Green'), { target: { value: 'Red, Blue' } })

  fireEvent.click(screen.getByText('Add Dimension'))
  const nameInputs = screen.getAllByPlaceholderText('e.g. color')
  const valuesInputs = screen.getAllByPlaceholderText('e.g. Red, Blue, Green')
  fireEvent.change(nameInputs[1], { target: { value: 'size' } })
  fireEvent.change(valuesInputs[1], { target: { value: 'S, M' } })

  fireEvent.click(screen.getByText('Create & Add'))

  await waitFor(() => {
    expect(screen.getByText('Choose Variants to Add')).toBeInTheDocument()
    expect(screen.getByText('Red / S (RED-S)')).toBeInTheDocument()
    expect(screen.getByText('Red / M (RED-M)')).toBeInTheDocument()
    expect(screen.getByText('Blue / S (BLUE-S)')).toBeInTheDocument()
    expect(screen.getByText('Blue / M (BLUE-M)')).toBeInTheDocument()
  })
})

it('passes supplierId to createProduct payload', async () => {
  mockCreateProduct.mockResolvedValue({
    id: 'prod1',
    name: 'Test',
    variants: [{ id: 'v1', name: 'Default', sku_variant_code: 'DEFAULT' }],
  })

  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} supplierId="sup1" />)

  fireEvent.change(getProductNameInput(), { target: { value: 'Test' } })
  fireEvent.click(screen.getByText('SelectCategory'))
  fireEvent.click(screen.getByText('Create & Add'))

  await waitFor(() => {
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ supplier_id: 'sup1' })
    )
  })
})
