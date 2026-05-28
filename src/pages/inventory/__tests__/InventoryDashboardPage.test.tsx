import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import InventoryDashboardPage from '../InventoryDashboardPage'

vi.mock('../../../hooks/useInventory', () => ({
  useInventorySummary: vi.fn(),
  useAvgSales: vi.fn(),
}))

import { useInventorySummary, useAvgSales } from '../../../hooks/useInventory'

const mockWarehouses = [
  { id: 'w1', name: 'Gudang A' },
  { id: 'w2', name: 'Gudang B' },
]

const mockProducts = [
  {
    product_id: 'p1',
    product_name: 'T-Shirt',
    sku_code: 'TSH-001',
    photo_url: null,
    variants: [
      {
        variant_id: 'v1',
        sku_variant_code: 'TSH-001-BLK-M',
        variant_name: 'Black / M',
        variant_values: { color: 'Black', size: 'M' },
        total_qty: 10,
        warehouse_stocks: { w1: 6, w2: 4 },
        current_cogs: 50000,
        base_price: 100000,
      },
      {
        variant_id: 'v2',
        sku_variant_code: 'TSH-001-WHT-L',
        variant_name: 'White / L',
        variant_values: { color: 'White', size: 'L' },
        total_qty: 0,
        warehouse_stocks: { w1: 0, w2: 0 },
        current_cogs: 45000,
        base_price: 95000,
      },
    ],
  },
  {
    product_id: 'p2',
    product_name: 'Jeans',
    sku_code: 'JNS-002',
    photo_url: null,
    variants: [
      {
        variant_id: 'v3',
        sku_variant_code: 'JNS-002-BLU-32',
        variant_name: 'Blue / 32',
        variant_values: { color: 'Blue', size: '32' },
        total_qty: 200,
        warehouse_stocks: { w1: 200, w2: 0 },
        current_cogs: 120000,
        base_price: 250000,
      },
    ],
  },
]

const mockSummaryData = {
  warehouses: mockWarehouses,
  products: mockProducts,
  summary: {
    total_cogs_stock: 20500000,
    total_selling_price: 40000000,
    total_products: 2,
    total_variants: 3,
  },
}

const mockAvgSalesData = {
  days: 30,
  date_from: '2026-04-28',
  results: [
    { variant_id: 'v1', sku_variant_code: 'TSH-001-BLK-M', variant_name: 'Black / M', avg_sales_per_day: 0.5, total_qty_sold: 15, days: 30 },
    { variant_id: 'v3', sku_variant_code: 'JNS-002-BLU-32', variant_name: 'Blue / 32', avg_sales_per_day: 0.1, total_qty_sold: 3, days: 30 },
  ],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <InventoryDashboardPage />
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never
it('renders summary cards with formatted IDR values from mocked data', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  expect(screen.getByText('Total COGS Stock')).toBeInTheDocument()
  expect(screen.getByText('Total Selling Price')).toBeInTheDocument()
  expect(screen.getByText('Products')).toBeInTheDocument()
  expect(screen.getByText('Variants')).toBeInTheDocument()
})

it('renders product name and sku_code in the product header row', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  expect(screen.getByText('T-Shirt')).toBeInTheDocument()
  expect(screen.getByText('TSH-001')).toBeInTheDocument()
  expect(screen.getByText('Jeans')).toBeInTheDocument()
  expect(screen.getByText('JNS-002')).toBeInTheDocument()
})

it('renders variant sku_variant_code in variant rows', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  expect(screen.getByText('TSH-001-BLK-M')).toBeInTheDocument()
  expect(screen.getByText('TSH-001-WHT-L')).toBeInTheDocument()
  expect(screen.getByText('JNS-002-BLU-32')).toBeInTheDocument()
})

it('shows OOS badge when total_qty is 0', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  const oosBadges = screen.getAllByText('OOS')
  expect(oosBadges.length).toBe(1)
})

it('shows Overstock badge when DOI > 90', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  const overstockBadges = screen.getAllByText('Overstock')
  expect(overstockBadges.length).toBe(1)
})

it('search filters products by name', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  const input = screen.getByPlaceholderText('Search product or SKU...')
  fireEvent.change(input, { target: { value: 'jeans' } })
  expect(screen.getByText('Jeans')).toBeInTheDocument()
  expect(screen.queryByText('T-Shirt')).not.toBeInTheDocument()
})

it('7d/30d toggle buttons are present and switch the active state', () => {
  vi.mocked(useInventorySummary).mockReturnValue(hookResult(mockSummaryData))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  renderPage()
  const btn7d = screen.getByText('7d')
  const btn30d = screen.getByText('30d')
  expect(btn7d).toBeInTheDocument()
  expect(btn30d).toBeInTheDocument()
  fireEvent.click(btn7d)
  expect(btn7d.className).toContain('bg-primary')
  fireEvent.click(btn30d)
  expect(btn30d.className).toContain('bg-primary')
})

