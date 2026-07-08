import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect, beforeEach } from 'vitest'
import { CategorySelect } from './CategorySelect'

vi.mock('../../hooks/api/useInventory', () => ({
  useCategories: () => ({
    data: {
      results: [
        { id: 'c1', name: 'Dress', category_code: 'DRS', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
        { id: 'c2', name: 'Jeans', category_code: 'JNG', description: '', is_active: true, company: 'co1', cdate: '', udate: '' },
      ],
      count: 2,
    },
  }),
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../pages/inventory/CategoryFormModal', () => ({
  CategoryFormModal: ({ open, onCreated }: { open: boolean; onCreated?: (c: unknown) => void }) =>
    open ? <button onClick={() => onCreated?.({ id: 'c3', name: 'T-Shirt', category_code: 'TSH', description: '', is_active: true, company: 'co1', cdate: '', udate: '' })}>MockCreate</button> : null,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders trigger with placeholder when no value', () => {
  render(<CategorySelect value="" onChange={vi.fn()} />)
  expect(screen.getByText('Select category')).toBeInTheDocument()
})

it('renders trigger with selected category name and code', () => {
  render(<CategorySelect value="c1" onChange={vi.fn()} />)
  expect(screen.getByText('Dress (DRS)')).toBeInTheDocument()
})

it('opens dropdown and shows categories on click', async () => {
  const user = userEvent.setup()
  render(<CategorySelect value="" onChange={vi.fn()} />)

  await user.click(screen.getByText('Select category'))

  expect(screen.getByText('Dress (DRS)')).toBeInTheDocument()
  expect(screen.getByText('Jeans (JNG)')).toBeInTheDocument()
})

it('filters categories by name when typing', async () => {
  const user = userEvent.setup()
  render(<CategorySelect value="" onChange={vi.fn()} />)

  await user.click(screen.getByText('Select category'))
  await user.type(screen.getByPlaceholderText('Search category...'), 'dress')

  expect(screen.getByText('Dress (DRS)')).toBeInTheDocument()
  expect(screen.queryByText('Jeans (JNG)')).not.toBeInTheDocument()
})

it('filters categories by category_code when typing', async () => {
  const user = userEvent.setup()
  render(<CategorySelect value="" onChange={vi.fn()} />)

  await user.click(screen.getByText('Select category'))
  await user.type(screen.getByPlaceholderText('Search category...'), 'JNG')

  expect(screen.getByText('Jeans (JNG)')).toBeInTheDocument()
  expect(screen.queryByText('Dress (DRS)')).not.toBeInTheDocument()
})

it('calls onChange with category id when item clicked', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<CategorySelect value="" onChange={onChange} />)

  await user.click(screen.getByText('Select category'))
  await user.click(screen.getByText('Dress (DRS)'))

  expect(onChange).toHaveBeenCalledWith('c1')
})

it('shows "New Category" button in dropdown', async () => {
  const user = userEvent.setup()
  render(<CategorySelect value="" onChange={vi.fn()} />)

  await user.click(screen.getByText('Select category'))

  expect(screen.getByText('New Category')).toBeInTheDocument()
})

it('clicking "New Category" opens CategoryFormModal, after creation calls onChange', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<CategorySelect value="" onChange={onChange} />)

  await user.click(screen.getByText('Select category'))
  await user.click(screen.getByText('New Category'))

  await waitFor(() => {
    expect(screen.getByText('MockCreate')).toBeInTheDocument()
  })

  await user.click(screen.getByText('MockCreate'))

  expect(onChange).toHaveBeenCalledWith('c3')
})
