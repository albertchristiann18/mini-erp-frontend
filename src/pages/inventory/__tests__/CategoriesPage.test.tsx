import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeAll } from 'vitest'
import CategoriesPage from '../CategoriesPage'

const mockUseCategories = vi.fn()
const mockUseUpdateCategory = vi.fn()
const mockUseCreateCategory = vi.fn()
const mockUseDeleteCategory = vi.fn()
const mockUseAuth = vi.fn()

const mockDeleteMutateAsync = vi.fn()

vi.mock('../../../hooks/api/useInventory', () => ({
  useCategories: (...args: unknown[]) => mockUseCategories(...args),
  useUpdateCategory: (...args: unknown[]) => mockUseUpdateCategory(...args),
  useCreateCategory: (...args: unknown[]) => mockUseCreateCategory(...args),
  useDeleteCategory: (...args: unknown[]) => mockUseDeleteCategory(...args),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn()
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn()
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn()
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders category name, code, and description in rows', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: 'Dresses', is_active: true, company: 'co1', cdate: '', udate: '' },
        { id: 'c2', name: 'Jeans', category_code: 'JNG', description: '', is_active: false, company: 'co1', cdate: '', udate: '' },
      ],
      count: 2,
    },
    isLoading: false,
  })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })
  mockUseCreateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('Dress')).toBeInTheDocument()
  expect(screen.getByText('DRS')).toBeInTheDocument()
  expect(screen.getByText('Dresses')).toBeInTheDocument()
  expect(screen.getByText('Jeans')).toBeInTheDocument()
  expect(screen.getByText('JNG')).toBeInTheDocument()
})

it('shows "New Category" button for staff users', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument()
})

it('does not show "New Category" button for non-staff users', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.queryByRole('button', { name: /new category/i })).not.toBeInTheDocument()
})

it('shows Active/Inactive badge correctly', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
        { id: 'c2', name: 'Jeans', category_code: 'JNG', description: '', is_active: false, company: 'co1', cdate: '', udate: '' },
      ],
      count: 2,
    },
    isLoading: false,
  })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('Active')).toBeInTheDocument()
  expect(screen.getByText('Inactive')).toBeInTheDocument()
})

it('edit button click opens the modal', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
      ],
      count: 1,
    },
    isLoading: false,
  })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  const editButtons = screen.getAllByRole('button', { name: '' })
  const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
  expect(pencilButton).toBeInTheDocument()

  const { userEvent } = await import('@testing-library/user-event')
  await userEvent.click(pencilButton!)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('test_delete_category_opens_confirm_dialog', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
      ],
      count: 1,
    },
    isLoading: false,
  })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: mockDeleteMutateAsync, isPending: false })

  renderPage()

  const trashButtons = screen.getAllByRole('button', { name: '' })
  const trashButton = trashButtons.find(btn => btn.querySelector('.lucide-trash-2'))
  expect(trashButton).toBeInTheDocument()

  const { userEvent } = await import('@testing-library/user-event')
  await userEvent.click(trashButton!)

  expect(screen.getByText('Delete Category')).toBeInTheDocument()
  expect(screen.getAllByText('Dress').length).toBeGreaterThan(0)
})

it('test_delete_category_success', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
      ],
      count: 1,
    },
    isLoading: false,
  })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockDeleteMutateAsync.mockResolvedValue(undefined)
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: mockDeleteMutateAsync, isPending: false })

  renderPage()

  const trashButtons = screen.getAllByRole('button', { name: '' })
  const trashButton = trashButtons.find(btn => btn.querySelector('.lucide-trash-2'))
  expect(trashButton).toBeInTheDocument()

  const { userEvent } = await import('@testing-library/user-event')
  await userEvent.click(trashButton!)

  await userEvent.click(screen.getByRole('button', { name: /delete/i }))

  expect(mockDeleteMutateAsync).toHaveBeenCalledWith('c1')
})

it('test_delete_category_blocked_shows_sku_modal', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
      ],
      count: 1,
    },
    isLoading: false,
  })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockDeleteMutateAsync.mockRejectedValue({ response: { data: { products: [{ name: 'Dress Floral', sku_code: 'DRS-001' }, { name: 'Jeans Slim', sku_code: 'DRS-002' }] } } })
  mockUseDeleteCategory.mockReturnValue({ mutateAsync: mockDeleteMutateAsync, isPending: false })

  renderPage()

  const trashButtons = screen.getAllByRole('button', { name: '' })
  const trashButton = trashButtons.find(btn => btn.querySelector('.lucide-trash-2'))
  expect(trashButton).toBeInTheDocument()

  const { userEvent } = await import('@testing-library/user-event')
  await userEvent.click(trashButton!)

  await userEvent.click(screen.getByRole('button', { name: /delete/i }))

  expect(screen.getByText('Cannot Delete Category')).toBeInTheDocument()
  expect(screen.getByText('Dress Floral')).toBeInTheDocument()
  expect(screen.getByText('Jeans Slim')).toBeInTheDocument()
  expect(screen.getByText('DRS-001')).toBeInTheDocument()
  expect(screen.getByText('DRS-002')).toBeInTheDocument()
})
