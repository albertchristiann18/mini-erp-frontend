import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import { PoolBrowser } from '../components/PoolBrowser'
import * as useSourcingPoolModule from '../hooks/useSourcingPool'
import type { SourcingPoolItem } from '../../../types/purchasing'

vi.mock('../hooks/useSourcingPool', () => ({
  useSourcingPoolItems: vi.fn(),
}))

const mockedUseSourcingPoolItems = vi.mocked(useSourcingPoolModule.useSourcingPoolItems)

function makeItem(id: string, productName: string | null, variantName: string, overrides: Partial<SourcingPoolItem> = {}): SourcingPoolItem {
  return {
    id,
    product_name: productName,
    variant_name: variantName,
    category_id: null,
    category_name: null,
    category_code: null,
    unit_price: '10.00',
    discounted_price: null,
    qty_suggested: null,
    supplier_link: null,
    image_url: null,
    image_proxy_url: null,
    image_download_status: 'DONE' as const,
    notes: null,
    times_ordered: 0,
    cdate: '',
    udate: '',
    variant_id: null,
    variant_code: null,
    ...overrides,
  }
}

function renderBrowser(props: Partial<React.ComponentProps<typeof PoolBrowser>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PoolBrowser
          supplierId="sup1"
          newItemKeys={new Set()}
          onAddLines={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders nothing when pool has no items', () => {
  mockedUseSourcingPoolItems.mockReturnValue({ data: { pool_id: null, items: [] as SourcingPoolItem[] }, isLoading: false, isError: false } as unknown as ReturnType<typeof mockedUseSourcingPoolItems>)
  const { container } = renderBrowser()
  expect(container.textContent).toBe('')
})

it('groups items by product_name into group headers', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [
        makeItem('i1', 'Widget', 'Red'),
        makeItem('i2', 'Widget', 'Blue'),
        makeItem('i3', 'Gadget', 'Small'),
        makeItem('i4', 'Gadget', 'Large'),
      ],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  expect(screen.getByText('Widget')).toBeInTheDocument()
  expect(screen.getByText('Gadget')).toBeInTheDocument()
  expect(screen.getAllByText('2 variants')).toHaveLength(2)
})

it('first 3 groups expanded, remaining collapsed', () => {
  const groups = ['A', 'B', 'C', 'D', 'E']
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: groups.map((g, i) => makeItem(`i${i}`, g, `Variant ${g}`)),
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  expect(screen.getByText('Variant A')).toBeInTheDocument()
  expect(screen.getByText('Variant B')).toBeInTheDocument()
  expect(screen.getByText('Variant C')).toBeInTheDocument()
  expect(screen.queryByText('Variant D')).not.toBeInTheDocument()
  expect(screen.queryByText('Variant E')).not.toBeInTheDocument()
})

it('N New badge shown on group header when group has new items', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [
        makeItem('i1', 'Widget', 'Red'),
        makeItem('i2', 'Widget', 'Blue'),
      ],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser({ newItemKeys: new Set(['Widget|Red']) })
  expect(screen.getByText('1 New')).toBeInTheDocument()
})

it('New badge shown on individual variant row', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [
        makeItem('i1', 'Widget', 'Red'),
        makeItem('i2', 'Widget', 'Blue'),
      ],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser({ newItemKeys: new Set(['Widget|Red']) })
  const newBadges = screen.getAllByText('New')
  expect(newBadges).toHaveLength(1)
})

it('Add to PO button disabled when nothing checked', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [makeItem('i1', 'Widget', 'Red')],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  const btn = screen.getByRole('button', { name: /add to po/i })
  expect(btn).toBeDisabled()
})

it('checking variant enables Add to PO button', async () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [makeItem('i1', 'Widget', 'Red')],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  const checkbox = screen.getByRole('checkbox')
  await userEvent.click(checkbox)
  const btn = screen.getByRole('button', { name: /add/i })
  expect(btn).not.toBeDisabled()
})

it('Add to PO calls onAddLines with correct selection data', async () => {
  const onAddLines = vi.fn()
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [makeItem('item1', 'Widget', 'Red')],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser({ onAddLines })
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByText(/^Add/))
  expect(onAddLines).toHaveBeenCalledWith([
    expect.objectContaining({
      sourcing_item_id: 'item1',
      ordered_qty: 1,
      product_name: 'Widget',
      variant_name: 'Red',
    }),
  ])
})

it('default qty comes from qty_suggested when available', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [makeItem('i1', 'Widget', 'Red', { qty_suggested: 5 })],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  const qtyInputs = screen.getAllByRole('spinbutton')
  expect(qtyInputs[0]).toHaveValue(5)
})

it('default qty is 1 when qty_suggested is null', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [makeItem('i1', 'Widget', 'Red', { qty_suggested: null })],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  const qtyInputs = screen.getAllByRole('spinbutton')
  expect(qtyInputs[0]).toHaveValue(1)
})

it('after Add to PO, selection count resets to 0', async () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [makeItem('i1', 'Widget', 'Red')],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  const onAddLines = vi.fn()
  renderBrowser({ onAddLines })
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByText(/^Add/))
  expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
})

it('mapped_item_shows_mapped_badge', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: { pool_id: 'p1', items: [makeItem('i1', 'Widget', 'Red', { variant_id: 'v1', variant_code: 'W-RED' })] },
    isLoading: false, isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  expect(screen.getByText('Mapped')).toBeInTheDocument()
})

it('unmapped_item_does_not_show_mapped_badge', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: { pool_id: 'p1', items: [makeItem('i1', 'Widget', 'Red', { variant_id: null })] },
    isLoading: false, isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  expect(screen.queryByText('Mapped')).not.toBeInTheDocument()
})

it('add_to_po_includes_variant_id_for_mapped_item', async () => {
  const onAddLines = vi.fn()
  mockedUseSourcingPoolItems.mockReturnValue({
    data: { pool_id: 'p1', items: [makeItem('i1', 'Widget', 'Red', { variant_id: 'v1', variant_code: 'W-RED' })] },
    isLoading: false, isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser({ onAddLines })
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByText(/^Add/))
  expect(onAddLines).toHaveBeenCalledWith([
    expect.objectContaining({ variant_id: 'v1', sourcing_item_id: 'i1' }),
  ])
})

it('add_to_po_includes_null_variant_id_for_unmapped_item', async () => {
  const onAddLines = vi.fn()
  mockedUseSourcingPoolItems.mockReturnValue({
    data: { pool_id: 'p1', items: [makeItem('i1', 'Widget', 'Red', { variant_id: null })] },
    isLoading: false, isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser({ onAddLines })
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByText(/^Add/))
  expect(onAddLines).toHaveBeenCalledWith([
    expect.objectContaining({ variant_id: null }),
  ])
})

it('null_product_name_items_group_by_supplier_link', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [
        makeItem('i1', 'Widget', 'Red'),
        makeItem('i2', 'Widget', 'Blue'),
        makeItem('i3', 'Gadget', 'Small'),
        makeItem('u1', null, 'VarA', { supplier_link: 'https://taobao.com/item/1' }),
        makeItem('u2', null, 'VarB', { supplier_link: 'https://taobao.com/item/1' }),
      ],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  expect(screen.getByText('Widget')).toBeInTheDocument()
  expect(screen.getByText('Gadget')).toBeInTheDocument()
  expect(screen.getByText('taobao.com/item/1')).toBeInTheDocument()
  const variantCounts = screen.getAllByText(/^\d+ variants$/)
  expect(variantCounts).toHaveLength(3)
})

it('unnamed_group_shows_unnamed_badge_and_truncated_url', () => {
  mockedUseSourcingPoolItems.mockReturnValue({
    data: {
      pool_id: 'p1',
      items: [
        makeItem('u1', null, 'VarA', { supplier_link: 'https://taobao.com/item/123456789' }),
      ],
    },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof mockedUseSourcingPoolItems>)
  renderBrowser()
  expect(screen.getByText('Unnamed')).toBeInTheDocument()
  expect(screen.getByText('taobao.com/item/123456789')).toBeInTheDocument()
  expect(screen.queryByText('https://taobao.com/item/123456789')).not.toBeInTheDocument()
})
