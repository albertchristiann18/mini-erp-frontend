import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import { DaftarVariasiTable } from '../DaftarVariasiTable'

function makeRow(overrides = {}) {
  return {
    id: undefined,
    variantValues: { Warna: 'Merah', Ukuran: 'S' },
    sku_variant_code: 'TST-RED-S',
    base_price: 50000,
    current_cogs: 0,
    total_available_qty: 5,
    hasStock: false,
    removed: false,
    photoUrl: null,
    pendingPhoto: null,
    ...overrides,
  }
}

const defaultProps = {
  dim1Key: 'Warna',
  dim2Key: 'Ukuran',
  dim1Options: ['Merah', 'Biru'],
  dim2Options: ['S', 'M'],
  rows: [
    makeRow({ variantValues: { Warna: 'Merah', Ukuran: 'S' }, sku_variant_code: 'RED-S' }),
    makeRow({ variantValues: { Warna: 'Merah', Ukuran: 'M' }, sku_variant_code: 'RED-M' }),
    makeRow({ variantValues: { Warna: 'Biru', Ukuran: 'S' }, sku_variant_code: 'BLUE-S' }),
  ],
  dimensionImages: [],
  isEditing: true,
  onRowChange: vi.fn(),
  onRemoveRow: vi.fn(),
  onBulkFillPrice: vi.fn(),
  onDimensionImageUpload: vi.fn().mockResolvedValue(undefined),
  onDimensionImageDelete: vi.fn().mockResolvedValue(undefined),
}

function renderTable(overrides = {}) {
  const props = { ...defaultProps, ...overrides }
  return { ...render(<DaftarVariasiTable {...props} />), props }
}

describe('DaftarVariasiTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when dim1Key is empty', () => {
    renderTable({ dim1Key: '' })
    expect(screen.getByText(/Belum ada variasi/)).toBeInTheDocument()
  })

  it('shows empty state when dim1Options is empty and no active rows', () => {
    renderTable({ dim1Options: [], rows: [] })
    expect(screen.getByText(/Belum ada variasi/)).toBeInTheDocument()
  })

  it('renders orphaned rows with warning when dim1Options is empty but active rows exist', () => {
    const rows = [
      makeRow({ variantValues: { Warna: 'Merah', Ukuran: 'S' }, sku_variant_code: 'RED-S' }),
    ]
    renderTable({ dim1Options: [], rows })
    expect(screen.getByText('⚠')).toBeInTheDocument()
    expect(screen.getByText('Merah')).toBeInTheDocument()
  })

  it('renders orphaned rows with empty string dim1Value when dimension key changed', () => {
    const rows = [
      makeRow({
        variantValues: { Ukuran: '100', Berat: '1kg' },
        sku_variant_code: 'ORPHAN-100',
        base_price: 25000,
        total_available_qty: 3,
      }),
    ]
    renderTable({ dim1Key: 'color', dim1Options: [], rows })
    expect(screen.queryByText(/Belum ada variasi/)).not.toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ORPHAN-100')).toBeInTheDocument()
  })

  it('renders column header with dim1Key name', () => {
    renderTable()
    expect(screen.getByText('Warna')).toBeInTheDocument()
  })

  it('renders dim2Key column header when dim2 is set', () => {
    renderTable()
    expect(screen.getByText('Ukuran')).toBeInTheDocument()
  })

  it('does not render dim2Key column when dim2Key is empty', () => {
    renderTable({ dim2Key: '', dim2Options: [] })
    expect(screen.queryByText('Ukuran')).not.toBeInTheDocument()
  })

  it('groups rows by dim1 value — each dim1 value appears once in the table', () => {
    renderTable()
    // Merah and Biru each appear once as group headers (rowspan)
    const redCells = screen.getAllByText('Merah')
    const blueCells = screen.getAllByText('Biru')
    expect(redCells).toHaveLength(1)
    expect(blueCells).toHaveLength(1)
  })

  it('renders dim2 option values as separate rows within each group', () => {
    renderTable()
    expect(screen.getAllByText('S')).toHaveLength(2) // one for Merah, one for Biru
    expect(screen.getAllByText('M')).toHaveLength(1)
  })

  it('renders a single Terapkan ke semua row at the top', () => {
    renderTable()
    expect(screen.getAllByText(/Terapkan ke semua/)).toHaveLength(1)
  })

  it('TerapkanRow calls onBulkFillPrice with price only when button clicked', async () => {
    const onBulkFillPrice = vi.fn()
    renderTable({ onBulkFillPrice })
    const priceInput = screen.getByPlaceholderText('0')
    fireEvent.change(priceInput, { target: { value: '75000' } })
    const terapkanBtn = screen.getByRole('button', { name: 'Terapkan' })
    await userEvent.click(terapkanBtn)
    expect(onBulkFillPrice).toHaveBeenCalledWith(75000)
  })

  it('TerapkanRow does not call onBulkFillPrice when price input is empty', async () => {
    const onBulkFillPrice = vi.fn()
    renderTable({ onBulkFillPrice })
    const terapkanBtn = screen.getByRole('button', { name: 'Terapkan' })
    await userEvent.click(terapkanBtn)
    expect(onBulkFillPrice).not.toHaveBeenCalled()
  })

  it('single TerapkanRow appears even when all rows are orphaned (dim1Options empty)', () => {
    const rows = [
      makeRow({ variantValues: { Warna: 'Hijau', Ukuran: 'S' }, sku_variant_code: 'GRN-S' }),
    ]
    renderTable({ dim1Options: [], rows })
    expect(screen.getByText(/Terapkan ke semua/)).toBeInTheDocument()
  })

  it('orphaned row (dim1 value not in dim1Options) shows warning icon', () => {
    const rows = [
      makeRow({ variantValues: { Warna: 'Hijau', Ukuran: 'S' }, sku_variant_code: 'GRN-S' }),
    ]
    renderTable({ rows })
    expect(screen.getByText('⚠')).toBeInTheDocument()
    expect(screen.getByText('Hijau')).toBeInTheDocument()
  })

  it('row with hasStock=true shows Ada stok badge instead of delete button', () => {
    const rows = [makeRow({ hasStock: true, total_available_qty: 10 })]
    renderTable({ rows, dim1Options: ['Merah'], dim2Options: ['S'] })
    expect(screen.getByText('Ada stok')).toBeInTheDocument()
  })

  it('row with hasStock=false shows delete button', () => {
    const rows = [makeRow({ hasStock: false })]
    renderTable({ rows, dim1Options: ['Merah'], dim2Options: ['S'] })
    expect(screen.queryByText('Ada stok')).not.toBeInTheDocument()
  })

  it('clicking delete button calls onRemoveRow with the correct row index', async () => {
    const onRemoveRow = vi.fn()
    const rows = [
      makeRow({ variantValues: { Warna: 'Merah', Ukuran: 'S' }, hasStock: false }),
    ]
    renderTable({ rows, dim1Options: ['Merah'], dim2Options: ['S'], onRemoveRow })
    const deleteBtn = screen.getByRole('button', { name: '' }) // X icon button in Aksi cell
    await userEvent.click(deleteBtn)
    expect(onRemoveRow).toHaveBeenCalledWith(0)
  })

  it('onRowChange called with correct index and field when SKU input changes', async () => {
    const onRowChange = vi.fn()
    renderTable({ onRowChange })
    const skuInputs = screen.getAllByDisplayValue('RED-S')
    fireEvent.change(skuInputs[0], { target: { value: 'RED-S-NEW' } })
    expect(onRowChange).toHaveBeenCalledWith(0, 'sku_variant_code', 'RED-S-NEW')
  })

  it('removed rows are excluded from the table', () => {
    const rows = [
      makeRow({ variantValues: { Warna: 'Merah', Ukuran: 'S' }, removed: true }),
      makeRow({ variantValues: { Warna: 'Biru', Ukuran: 'S' }, removed: false }),
    ]
    renderTable({ rows })
    expect(screen.queryByText('Merah')).not.toBeInTheDocument()
    expect(screen.getByText('Biru')).toBeInTheDocument()
  })

  it('does not render Foto column header when isEditing is false', () => {
    renderTable({ isEditing: false })
    expect(screen.queryByText('Foto')).not.toBeInTheDocument()
  })
})
