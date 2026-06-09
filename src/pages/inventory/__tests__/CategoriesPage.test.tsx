import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeAll } from 'vitest'
import CategoriesPage from '../CategoriesPage'

const mockUseCategories = vi.fn()
const mockUseUpdateCategory = vi.fn()
const mockUseCreateCategory = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useCategories: (...args: unknown[]) => mockUseCategories(...args),
  useUpdateCategory: (...args: unknown[]) => mockUseUpdateCategory(...args),
  useCreateCategory: (...args: unknown[]) => mockUseCreateCategory(...args),
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

  renderPage()

  expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument()
})

it('does not show "New Category" button for non-staff users', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false, company_id: 'co1' } })
  mockUseCategories.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false })
  mockUseUpdateCategory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

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

  renderPage()

  const editButtons = screen.getAllByRole('button', { name: '' })
  const pencilButton = editButtons.find(btn => btn.querySelector('svg'))
  expect(pencilButton).toBeInTheDocument()

  const { userEvent } = await import('@testing-library/user-event')
  await userEvent.click(pencilButton!)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
