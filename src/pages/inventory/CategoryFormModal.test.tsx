import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect, beforeEach } from 'vitest'
import { CategoryFormModal } from './CategoryFormModal'

const mockMutateAsync = vi.fn()

vi.mock('../../hooks/api/useInventory', () => ({
  useCreateCategory: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders name, category_code, description fields', () => {
  render(<CategoryFormModal open={true} onClose={vi.fn()} />)
  expect(screen.getByPlaceholderText('e.g. Dress')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('e.g. DRS')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument()
})

it('calls createCategory with correct uppercased payload on submit', async () => {
  const user = userEvent.setup()
  render(<CategoryFormModal open={true} onClose={vi.fn()} />)

  await user.type(screen.getByPlaceholderText('e.g. Dress'), 'Dress')
  await user.type(screen.getByPlaceholderText('e.g. DRS'), 'drs')
  await user.type(screen.getByPlaceholderText('Optional description'), 'Clothing')

  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith({
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
  mockMutateAsync.mockResolvedValue(returnedCategory)

  render(<CategoryFormModal open={true} onClose={vi.fn()} onCreated={onCreated} />)

  await user.type(screen.getByPlaceholderText('e.g. Dress'), 'Dress')
  await user.type(screen.getByPlaceholderText('e.g. DRS'), 'drs')

  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(onCreated).toHaveBeenCalledWith(returnedCategory)
  })
})

it('shows validation error if name is empty', async () => {
  const user = userEvent.setup()
  render(<CategoryFormModal open={true} onClose={vi.fn()} />)

  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
})

it('shows validation error if category_code is empty', async () => {
  const user = userEvent.setup()
  render(<CategoryFormModal open={true} onClose={vi.fn()} />)

  await user.type(screen.getByPlaceholderText('e.g. Dress'), 'Dress')
  await user.click(screen.getByText('Create'))

  await waitFor(() => {
    expect(screen.getByText('Category code is required')).toBeInTheDocument()
  })
})
