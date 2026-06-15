import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, it, expect, beforeEach } from 'vitest'
import { QuickCreateProductModal } from '../QuickCreateProductModal'

const mockCreateProduct = vi.fn()
const mockUploadProductPhoto = vi.fn()
const mockUploadVariantPhoto = vi.fn()

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
  uploadVariantPhoto: (...args: unknown[]) => mockUploadVariantPhoto(...args),
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
  expect(screen.getByText('Add Variant')).toBeInTheDocument()
})

it('shows empty variant message when no rows', () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  expect(screen.getByText('No variants — a Default variant will be created automatically.')).toBeInTheDocument()
})

it('adds and removes variant rows', () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  fireEvent.click(screen.getByText('Add Variant'))
  expect(screen.getByPlaceholderText('e.g. Blue / M')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('BLU-M')).toBeInTheDocument()

  const xButtons = screen.getAllByRole('button').filter(b =>
    b.querySelector('svg.lucide-x')
  )
  fireEvent.click(xButtons[0])
  expect(screen.queryByPlaceholderText('e.g. Blue / M')).not.toBeInTheDocument()
})

it('validates required fields', async () => {
  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  fireEvent.click(screen.getByText('Create & Add'))
  await waitFor(() => {
    expect(screen.getByText('Product name is required')).toBeInTheDocument()
    expect(screen.getByText('Category is required')).toBeInTheDocument()
  })
})

it('submits with no variants (Default flow)', async () => {
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
    expect(onCreated).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'v1', label: 'Default (SKU-DEFAULT)' }),
    ])
  })
})

it('submits with multiple variants → shows picker', async () => {
  mockCreateProduct.mockResolvedValue({
    id: 'prod1',
    name: 'Test',
    variants: [
      { id: 'v1', name: 'Red', sku_variant_code: 'RED' },
      { id: 'v2', name: 'Blue', sku_variant_code: 'BLU' },
    ],
  })

  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

  fireEvent.change(getProductNameInput(), { target: { value: 'Test' } })
  fireEvent.click(screen.getByText('SelectCategory'))
  fireEvent.click(screen.getByText('Add Variant'))
  fireEvent.change(screen.getByPlaceholderText('e.g. Blue / M'), { target: { value: 'Red' } })
  fireEvent.change(screen.getByPlaceholderText('BLU-M'), { target: { value: 'RED' } })
  fireEvent.click(screen.getByText('Add Variant'))
  const inputs = screen.getAllByPlaceholderText('e.g. Blue / M')
  fireEvent.change(inputs[1], { target: { value: 'Blue' } })
  const skuInputs = screen.getAllByPlaceholderText('BLU-M')
  fireEvent.change(skuInputs[1], { target: { value: 'BLU' } })

  fireEvent.click(screen.getByText('Create & Add'))

  await waitFor(() => {
    expect(screen.getByText('Choose Variants to Add')).toBeInTheDocument()
    expect(screen.getByText('Red (RED)')).toBeInTheDocument()
    expect(screen.getByText('Blue (BLU)')).toBeInTheDocument()
  })
})

it('picker: add selected submits only checked variants', async () => {
  const onCreated = vi.fn()
  mockCreateProduct.mockResolvedValue({
    id: 'prod1',
    name: 'Test',
    variants: [
      { id: 'v1', name: 'Red', sku_variant_code: 'RED' },
      { id: 'v2', name: 'Blue', sku_variant_code: 'BLU' },
    ],
  })

  render(<QuickCreateProductModal open={true} onClose={vi.fn()} onCreated={onCreated} />)

  fireEvent.change(getProductNameInput(), { target: { value: 'Test' } })
  fireEvent.click(screen.getByText('SelectCategory'))
  fireEvent.click(screen.getByText('Add Variant'))
  fireEvent.change(screen.getByPlaceholderText('e.g. Blue / M'), { target: { value: 'Red' } })
  fireEvent.change(screen.getByPlaceholderText('BLU-M'), { target: { value: 'RED' } })
  fireEvent.click(screen.getByText('Add Variant'))
  const inputs = screen.getAllByPlaceholderText('e.g. Blue / M')
  fireEvent.change(inputs[1], { target: { value: 'Blue' } })
  const skuInputs = screen.getAllByPlaceholderText('BLU-M')
  fireEvent.change(skuInputs[1], { target: { value: 'BLU' } })
  fireEvent.click(screen.getByText('Create & Add'))

  await waitFor(() => {
    expect(screen.getByText('Choose Variants to Add')).toBeInTheDocument()
  })

  const checkboxes = screen.getAllByRole('checkbox')
  fireEvent.click(checkboxes[1])

  fireEvent.click(screen.getByText(/Add Selected/))

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'v1' }),
    ])
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
