import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, it, expect, beforeEach } from 'vitest'
import { QuickCreateVariantModal } from '../QuickCreateVariantModal'

const mockCreateProduct = vi.fn()

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

vi.mock('../../../components/ui/CategorySelect', () => ({
  CategorySelect: ({ onChange }: { onChange: (id: string) => void }) => (
    <button onClick={() => onChange('cat1')}>SelectCategory</button>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders Product Name, Variant Name, SKU Suffix, dimensions fields', () => {
  render(<QuickCreateVariantModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  expect(screen.getByPlaceholderText('e.g. Kaos Polos')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('e.g. Blue / M')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('e.g. BLU-M')).toBeInTheDocument()
  expect(screen.getByText('Weight (g)')).toBeInTheDocument()
  expect(screen.getByText('Length (cm)')).toBeInTheDocument()
  expect(screen.getByText('Width (cm)')).toBeInTheDocument()
  expect(screen.getByText('Height (cm)')).toBeInTheDocument()
})

it('does NOT render a Product SKU input', () => {
  render(<QuickCreateVariantModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)
  expect(screen.queryByPlaceholderText('e.g. KAO-001')).not.toBeInTheDocument()
})

it('calls createProduct with correct payload on submit', async () => {
  mockCreateProduct.mockResolvedValue({ id: 'p1' })

  render(<QuickCreateVariantModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

  fireEvent.change(screen.getByPlaceholderText('e.g. Kaos Polos'), { target: { value: 'My Dress' } })
  fireEvent.click(screen.getByText('SelectCategory'))
  fireEvent.change(screen.getByPlaceholderText('e.g. Blue / M'), { target: { value: 'Red M' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. BLU-M'), { target: { value: 'RED-M' } })
  screen.getAllByPlaceholderText('0').forEach((el) => fireEvent.change(el, { target: { value: '0' } }))

  const form = document.querySelector('form')!
  fireEvent.submit(form)

  await waitFor(() => {
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-123',
        category_id: 'cat1',
        variants: [
          expect.objectContaining({
            sku_variant_code: 'RED-M',
          }),
        ],
      })
    )
  })
})

it('shows category required error if category not selected', async () => {
  render(<QuickCreateVariantModal open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

  fireEvent.change(screen.getByPlaceholderText('e.g. Kaos Polos'), { target: { value: 'My Dress' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. Blue / M'), { target: { value: 'Red M' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. BLU-M'), { target: { value: 'RED-M' } })

  const form = document.querySelector('form')!
  fireEvent.submit(form)

  await waitFor(() => {
    expect(screen.getByText(/expected string/i)).toBeInTheDocument()
  })
})

it('calls onCreated with variant id and label on success', async () => {
  const onCreated = vi.fn()

  mockCreateProduct.mockResolvedValue({
    id: 'p1',
    name: 'My Dress',
    variants: [{ id: 'v1', name: 'Red M', sku_variant_code: 'RED-M' }],
  })

  render(<QuickCreateVariantModal open={true} onClose={vi.fn()} onCreated={onCreated} />)

  fireEvent.change(screen.getByPlaceholderText('e.g. Kaos Polos'), { target: { value: 'My Dress' } })
  fireEvent.click(screen.getByText('SelectCategory'))
  fireEvent.change(screen.getByPlaceholderText('e.g. Blue / M'), { target: { value: 'Red M' } })
  fireEvent.change(screen.getByPlaceholderText('e.g. BLU-M'), { target: { value: 'RED-M' } })
  screen.getAllByPlaceholderText('0').forEach((el) => fireEvent.change(el, { target: { value: '0' } }))

  const form = document.querySelector('form')!
  fireEvent.submit(form)

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith('v1', 'Red M (RED-M)')
  })
})
