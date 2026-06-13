import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, beforeAll } from 'vitest'
import { CategoryFormModal } from '../CategoryFormModal'

const mockCreateCategory = vi.fn()
const mockUpdateCategory = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useCreateCategory: () => ({ mutateAsync: mockCreateCategory, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: mockUpdateCategory, isPending: false }),
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

function renderModal(props: Partial<React.ComponentProps<typeof CategoryFormModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CategoryFormModal
        open
        onClose={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  )
}

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
