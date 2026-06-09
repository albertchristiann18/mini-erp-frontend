import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import SuppliersPage from '../../../pages/purchasing/SuppliersPage'

const mockMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()

const mockSuppliersData: { count: number; results: Record<string, unknown>[] } = {
  count: 2,
  results: [
    { id: 's1', name: 'Alpha Supplies', contact_name: 'John', phone: '123456', country: 'China', notes: null, supplier_link: null, is_active: true, company_id: 'c1', cdate: '', udate: '' },
    { id: 's2', name: 'Beta Trading', contact_name: null, phone: null, country: null, notes: null, supplier_link: null, is_active: false, company_id: 'c1', cdate: '', udate: '' },
  ],
}

vi.mock('../../../hooks/useInventory', () => ({
  useSuppliers: () => ({ data: mockSuppliersData, isLoading: false }),
  useCreateSupplier: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useUpdateSupplier: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useDeleteSupplier: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: true } }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SuppliersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('test_suppliers_list_renders', async () => {
  renderPage()
  expect(await screen.findByText('Alpha Supplies')).toBeInTheDocument()
  expect(await screen.findByText('Beta Trading')).toBeInTheDocument()
  expect(await screen.findByText('John')).toBeInTheDocument()
  expect(await screen.findByText('123456')).toBeInTheDocument()
  expect(await screen.findByText('China')).toBeInTheDocument()
})

it('test_create_supplier_opens_modal', async () => {
  renderPage()
  fireEvent.click(await screen.findByRole('button', { name: /New Supplier/ }))
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toBeInTheDocument()
  expect(dialog).toHaveTextContent('Contact Name')
  expect(dialog).toHaveTextContent('Phone')
  expect(dialog).toHaveTextContent('Country')
  expect(dialog).toHaveTextContent('Notes')
})

it('test_create_supplier_submits', async () => {
  mockMutateAsync.mockResolvedValue({ id: 's3', name: 'Gamma Corp', is_active: true, contact_name: null, phone: null, country: 'China', notes: null, supplier_link: null, company_id: 'c1', cdate: '', udate: '' })
  renderPage()
  fireEvent.click(await screen.findByRole('button', { name: /New Supplier/ }))

  const nameInput = screen.getByPlaceholderText('Supplier name')
  fireEvent.change(nameInput, { target: { value: 'Gamma Corp' } })

  fireEvent.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Gamma Corp' }),
    )
  })
})

it('test_edit_supplier', async () => {
  mockUpdateMutateAsync.mockResolvedValue({ id: 's1' })
  renderPage()
  const editBtns = await screen.findAllByRole('button')
  const pencilBtn = editBtns.find(btn => btn.querySelector('.lucide-pencil'))
  if (pencilBtn) fireEvent.click(pencilBtn)

  expect(await screen.findByText('Edit Supplier')).toBeInTheDocument()

  const nameInput = screen.getByPlaceholderText('Supplier name')
  fireEvent.change(nameInput, { target: { value: 'Alpha Supplies Updated' } })

  fireEvent.click(screen.getByText('Update'))

  await waitFor(() => {
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 's1',
        data: expect.objectContaining({ name: 'Alpha Supplies Updated' }),
      }),
    )
  })
})

it('test_supplier_link_field_in_modal', async () => {
  renderPage()
  fireEvent.click(await screen.findByRole('button', { name: /New Supplier/ }))
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent('Supplier Link')
})

it('test_supplier_link_renders_in_table', async () => {
  mockSuppliersData.results = [
    { id: 's3', name: 'Gamma Corp', contact_name: null, phone: null, country: null, notes: null, supplier_link: 'https://example.com/store', is_active: true, company_id: 'c1', cdate: '', udate: '' },
  ]
  renderPage()
  const link = await screen.findByRole('link', { name: /https:\/\/example.com\/store/ })
  expect(link).toHaveAttribute('href', 'https://example.com/store')
})
