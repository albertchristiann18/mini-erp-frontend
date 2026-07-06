import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import ColorAbbreviationsPage from '../ColorAbbreviationsPage'

const mockData = [
  { id: '1', color_name: 'Dusty Rose', abbreviation: 'DSR' },
  { id: '2', color_name: 'Navy Blue', abbreviation: 'NVY' },
]

const mockUpsertMutateAsync = vi.fn().mockResolvedValue({})
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({})

let mockAbbreviations = mockData

vi.mock('../../../features/purchasing/hooks/useSourcingPool', () => ({
  useColorAbbreviations: vi.fn(() => ({ data: mockAbbreviations, isLoading: false })),
  useUpsertColorAbbreviation: vi.fn(() => ({ mutateAsync: mockUpsertMutateAsync, isPending: false })),
  useDeleteColorAbbreviation: vi.fn(() => ({ mutateAsync: mockDeleteMutateAsync, isPending: false })),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ColorAbbreviationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function getFirstDataRow() {
  const cell = screen.getByText('Dusty Rose')
  return cell.closest('tr')!
}

beforeEach(() => {
  mockAbbreviations = mockData
  mockUpsertMutateAsync.mockClear()
  mockDeleteMutateAsync.mockClear()
  vi.clearAllMocks()
})

it('renders_page_heading', () => {
  renderPage()
  expect(screen.getByText('Color Abbreviations')).toBeInTheDocument()
})

it('renders_empty_state_when_no_data', () => {
  mockAbbreviations = []
  renderPage()
  expect(screen.getByText('No color abbreviations defined yet.')).toBeInTheDocument()
})

it('renders_abbreviations_list', () => {
  renderPage()
  expect(screen.getByText('Dusty Rose')).toBeInTheDocument()
  expect(screen.getByText('DSR')).toBeInTheDocument()
  expect(screen.getByText('Navy Blue')).toBeInTheDocument()
  expect(screen.getByText('NVY')).toBeInTheDocument()
})

it('add_form_submits_upsert_mutation', async () => {
  renderPage()
  await userEvent.click(screen.getByText('Add Color'))

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  await userEvent.type(screen.getByLabelText('Color Name'), 'Coral')
  await userEvent.type(screen.getByLabelText('Abbreviation'), 'CRL')
  await userEvent.click(screen.getByText('Add'))

  await waitFor(() => {
    expect(mockUpsertMutateAsync).toHaveBeenCalledWith({ color_name: 'Coral', abbreviation: 'CRL' })
  })
})

it('edit_populates_form_with_existing_values', async () => {
  renderPage()
  const row = getFirstDataRow()
  const editBtn = within(row).getAllByRole('button')[0]
  await userEvent.click(editBtn)

  await waitFor(() => {
    const colorInput = screen.getByLabelText('Color Name') as HTMLInputElement
    const abbrInput = screen.getByLabelText('Abbreviation') as HTMLInputElement
    expect(colorInput).toHaveValue('Dusty Rose')
    expect(abbrInput).toHaveValue('DSR')
  })
})

it('edit_disables_color_name_field', async () => {
  renderPage()
  const row = getFirstDataRow()
  const editBtn = within(row).getAllByRole('button')[0]
  await userEvent.click(editBtn)

  await waitFor(() => {
    expect(screen.getByLabelText('Color Name')).toBeDisabled()
  })
})

it('save_edit_calls_upsert_with_new_abbreviation', async () => {
  renderPage()
  const row = getFirstDataRow()
  const editBtn = within(row).getAllByRole('button')[0]
  await userEvent.click(editBtn)

  await waitFor(() => {
    expect(screen.getByLabelText('Abbreviation')).toBeInTheDocument()
  })

  const abbrInput = screen.getByLabelText('Abbreviation')
  await userEvent.clear(abbrInput)
  await userEvent.type(abbrInput, 'DR')
  await userEvent.click(screen.getByText('Save'))

  await waitFor(() => {
    expect(mockUpsertMutateAsync).toHaveBeenCalledWith({ color_name: 'Dusty Rose', abbreviation: 'DR' })
  })
})

it('delete_calls_delete_mutation_after_confirm', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  renderPage()

  const row = getFirstDataRow()
  const deleteBtn = within(row).getAllByRole('button')[1]
  await userEvent.click(deleteBtn)

  await waitFor(() => {
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith('Dusty Rose')
  })
})

it('delete_cancelled_when_confirm_returns_false', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  renderPage()

  const row = getFirstDataRow()
  const deleteBtn = within(row).getAllByRole('button')[1]
  await userEvent.click(deleteBtn)

  expect(mockDeleteMutateAsync).not.toHaveBeenCalled()
})

it('abbreviation_max_length_validation', async () => {
  renderPage()
  await userEvent.click(screen.getByText('Add Color'))

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  const colorInput = screen.getByLabelText('Color Name')
  const abbrInput = screen.getByLabelText('Abbreviation')

  await userEvent.type(colorInput, 'Test')
  await userEvent.type(abbrInput, 'A'.repeat(21))
  await userEvent.click(screen.getByText('Add'))

  await waitFor(() => {
    expect(screen.getByText('Max 20 characters')).toBeInTheDocument()
  })
})
