import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, beforeEach } from 'vitest'
import { CategoryFormModal } from '../CategoryFormModal'

const mockCreateCategory = vi.fn()
const mockUpdateCategory = vi.fn()

vi.mock('../../../hooks/api/inventory', () => ({
  useCreateCategory: () => ({ mutateAsync: mockCreateCategory, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: mockUpdateCategory, isPending: false }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderModal(props: Partial<React.ComponentProps<typeof CategoryFormModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CategoryFormModal open onClose={vi.fn()} {...props} />
    </QueryClientProvider>,
  )
}

it('renders name, category_code, description fields', () => {
  renderModal()
  expect(screen.getByPlaceholderText('e.g. Dress')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('e.g. DRS')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument()
})

it('calls createCategory with correct uppercased payload on submit', async () => {
  const user = userEvent.setup()
  renderModal()

  await user.type(screen.getByPlaceholderText('e.g. Dress'), 'Dress')
  await user.type(screen.getByPlaceholderText('e.g. DRS'), 'drs')
  await user.type(screen.getByPlaceholderText('Optional description'), 'Clothing')

  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: 'Dress',
      category_code: 'DRS',
      description: 'Clothing',
    })
  })
})

it('calls onCreated with the returned category', async () => {
  const user = userEvent.setup()
  const onCreated = vi.fn()
  const returnedCategory = {
    id: 'cat1',
    name: 'Dress',
    category_code: 'DRS',
    description: '',
    is_active: true,
    company: 'c1',
    cdate: '',
    udate: '',
  }
  mockCreateCategory.mockResolvedValue(returnedCategory)

  renderModal({ onCreated })

  await user.type(screen.getByPlaceholderText('e.g. Dress'), 'Dress')
  await user.type(screen.getByPlaceholderText('e.g. DRS'), 'drs')

  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith(returnedCategory)
  })
})

it('shows validation error if name is empty', async () => {
  const user = userEvent.setup()
  renderModal()

  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
})

it('shows validation error if category_code is empty', async () => {
  const user = userEvent.setup()
  renderModal()

  await user.type(screen.getByPlaceholderText('e.g. Dress'), 'Dress')
  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(screen.getByText('Category code is required')).toBeInTheDocument()
  })
})

it('when category prop is provided, form is pre-filled with category data', () => {
  renderModal({
    category: { id: 'c1', name: 'Dress', category_code: 'DRS', description: 'Dresses', is_active: true, company: 'co1', cdate: '', udate: '' },
  })

  const nameInput = screen.getByDisplayValue('Dress')
  expect(nameInput).toBeInTheDocument()

  const codeInput = screen.getByDisplayValue('DRS')
  expect(codeInput).toBeInTheDocument()

  const descInput = screen.getByDisplayValue('Dresses')
  expect(descInput).toBeInTheDocument()
})

it('submit in edit mode calls updateCategory not createCategory', async () => {
  mockUpdateCategory.mockResolvedValue({})

  renderModal({
    category: { id: 'c1', name: 'Dress', category_code: 'DRS', description: 'Dresses', is_active: true, company: 'co1', cdate: '', udate: '' },
  })

  await userEvent.click(screen.getByRole('button', { name: /update/i }))

  await waitFor(() => {
    expect(mockUpdateCategory).toHaveBeenCalledWith({
      id: 'c1',
      data: { name: 'Dress', category_code: 'DRS', description: 'Dresses' },
    })
  })
  expect(mockCreateCategory).not.toHaveBeenCalled()
})
