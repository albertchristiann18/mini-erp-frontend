import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import { VariasiSetupSection } from '../VariasiSetup'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  horizontalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  arrayMove: vi.fn((arr: string[], from: number, to: number) => {
    const next = [...arr]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

function makeProps(overrides = {}) {
  return {
    dim1Key: 'Warna',
    dim1Options: ['Merah', 'Biru'],
    dim2Key: 'Ukuran',
    dim2Options: ['S', 'M'],
    showDim1: true,
    showDim2: true,
    hasDim1Stock: false,
    hasDim2Stock: false,
    onDim1KeyChange: vi.fn(),
    onDim1OptionsChange: vi.fn(),
    onDim2KeyChange: vi.fn(),
    onDim2OptionsChange: vi.fn(),
    onAddVariasi: vi.fn(),
    onRemoveDim1: vi.fn(),
    onRemoveDim2: vi.fn(),
    onSwapConfirmed: vi.fn(),
    onToastError: vi.fn(),
    ...overrides,
  }
}

function renderSection(overrides = {}) {
  const props = makeProps(overrides)
  return { ...render(<VariasiSetupSection {...props} />), props }
}

describe('VariasiSetupSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Variasi 1 row when showDim1 is true', () => {
    renderSection()
    expect(screen.getByText('Variasi 1')).toBeInTheDocument()
  })

  it('renders Variasi 2 row when showDim2 is true', () => {
    renderSection()
    expect(screen.getByText('Variasi 2')).toBeInTheDocument()
  })

  it('does not render Variasi 1 row when showDim1 is false', () => {
    renderSection({ showDim1: false, showDim2: false })
    expect(screen.queryByText('Variasi 1')).not.toBeInTheDocument()
  })

  it('does not render Variasi 2 row when showDim2 is false', () => {
    renderSection({ showDim2: false })
    expect(screen.queryByText('Variasi 2')).not.toBeInTheDocument()
  })

  it('hides Tambah Variasi button when both dims are shown', () => {
    renderSection({ showDim1: true, showDim2: true })
    expect(screen.queryByText(/Tambah Variasi/)).not.toBeInTheDocument()
  })

  it('shows Tambah Variasi button when only dim1 is shown', () => {
    renderSection({ showDim2: false })
    expect(screen.getByText(/Tambah Variasi/)).toBeInTheDocument()
  })

  it('calls onAddVariasi(2) when showDim1=true and showDim2=false and Tambah Variasi clicked', async () => {
    const onAddVariasi = vi.fn()
    renderSection({ showDim2: false, onAddVariasi })
    await userEvent.click(screen.getByText(/Tambah Variasi/))
    expect(onAddVariasi).toHaveBeenCalledWith(2)
  })

  it('calls onAddVariasi(1) when showDim1=false', async () => {
    const onAddVariasi = vi.fn()
    renderSection({ showDim1: false, showDim2: false, onAddVariasi })
    await userEvent.click(screen.getByText(/Tambah Variasi/))
    expect(onAddVariasi).toHaveBeenCalledWith(1)
  })

  it('shows Tukar Variasi button when both dims have keys', () => {
    renderSection({ showDim1: true, showDim2: true, dim1Key: 'Warna', dim2Key: 'Ukuran' })
    expect(screen.getByText(/Tukar Variasi/)).toBeInTheDocument()
  })

  it('hides Tukar Variasi button when dim1Key is empty', () => {
    renderSection({ dim1Key: '' })
    expect(screen.queryByText(/Tukar Variasi/)).not.toBeInTheDocument()
  })

  it('hides Tukar Variasi button when dim2Key is empty', () => {
    renderSection({ dim2Key: '' })
    expect(screen.queryByText(/Tukar Variasi/)).not.toBeInTheDocument()
  })

  it('clicking Tukar Variasi opens swap dialog with correct dim names', async () => {
    renderSection()
    await userEvent.click(screen.getByText(/Tukar Variasi/))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Tukar Variasi 1 \(Warna\) ↔ Variasi 2 \(Ukuran\)/)).toBeInTheDocument()
  })

  it('swap dialog Batal closes dialog without calling onSwapConfirmed', async () => {
    const onSwapConfirmed = vi.fn()
    renderSection({ onSwapConfirmed })
    await userEvent.click(screen.getByText(/Tukar Variasi/))
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onSwapConfirmed).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('swap dialog Tukar calls onSwapConfirmed and closes dialog', async () => {
    const onSwapConfirmed = vi.fn()
    renderSection({ onSwapConfirmed })
    await userEvent.click(screen.getByText(/Tukar Variasi/))
    const confirmBtn = screen.getAllByRole('button', { name: 'Tukar' }).find(b => !b.className.includes('gap'))
    await userEvent.click(confirmBtn!)
    expect(onSwapConfirmed).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('chip X button calls onDim1OptionsChange without the removed option', async () => {
    const onDim1OptionsChange = vi.fn()
    renderSection({ onDim1OptionsChange })
    await userEvent.click(screen.getByTestId('remove-chip-Merah'))
    expect(onDim1OptionsChange).toHaveBeenCalledWith(['Biru'])
  })

  it('adding a new option calls onDim1OptionsChange with appended value', async () => {
    const onDim1OptionsChange = vi.fn()
    renderSection({ onDim1OptionsChange })
    const addBtns = screen.getAllByText(/Tambah opsi/)
    await userEvent.click(addBtns[0])
    const input = screen.getByPlaceholderText('Tambah opsi...')
    await userEvent.type(input, 'Hijau')
    await userEvent.keyboard('{Enter}')
    expect(onDim1OptionsChange).toHaveBeenCalledWith(['Merah', 'Biru', 'Hijau'])
  })

  it('adding a duplicate option calls onToastError', async () => {
    const onToastError = vi.fn()
    renderSection({ onToastError })
    const addBtns = screen.getAllByText(/Tambah opsi/)
    await userEvent.click(addBtns[0])
    const input = screen.getByPlaceholderText('Tambah opsi...')
    await userEvent.type(input, 'Merah')
    await userEvent.keyboard('{Enter}')
    expect(onToastError).toHaveBeenCalledWith('Opsi sudah ada')
  })

  it('removing VariasiRow with hasDim1Stock=true calls onToastError instead of onRemoveDim1', async () => {
    const onRemoveDim1 = vi.fn()
    const onToastError = vi.fn()
    renderSection({ hasDim1Stock: true, onRemoveDim1, onToastError })
    await userEvent.click(screen.getByLabelText('Remove Variasi 1'))
    expect(onRemoveDim1).not.toHaveBeenCalled()
    expect(onToastError).toHaveBeenCalledWith('Tidak dapat menghapus Variasi 1: ada varian dengan stok')
  })

  it('removing VariasiRow with hasDim1Stock=false calls onRemoveDim1', async () => {
    const onRemoveDim1 = vi.fn()
    renderSection({ hasDim1Stock: false, onRemoveDim1 })
    await userEvent.click(screen.getByLabelText('Remove Variasi 1'))
    expect(onRemoveDim1).toHaveBeenCalledOnce()
  })
})
