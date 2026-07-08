import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import SalesDashboardPage from '../SalesDashboardPage'

vi.mock('../../../hooks/api/useSales', () => ({
  useSalesOrdersFiltered: vi.fn(),
}))

vi.mock('../../../hooks/api/useInventory', () => ({
  useAvgSales: vi.fn(),
  useAllVariants: vi.fn(),
}))

import { useSalesOrdersFiltered } from '../../../hooks/api/useSales'
import { useAvgSales, useAllVariants } from '../../../hooks/api/useInventory'

const mockOrders = [
  {
    id: 'o1', order_number: 'ORD-001', status: 'COMPLETED',
    source_platform: 'SHOPEE', order_date: '2026-05-01T00:00:00Z',
    net_revenue: 100000, total_cogs: 60000, gross_profit: 40000,
  },
  {
    id: 'o2', order_number: 'ORD-002', status: 'COMPLETED',
    source_platform: 'TIKTOK', order_date: '2026-05-02T00:00:00Z',
    net_revenue: 100000, total_cogs: 60000, gross_profit: 40000,
  },
  {
    id: 'o3', order_number: 'ORD-003', status: 'CANCELLED',
    source_platform: 'SHOPEE', order_date: '2026-05-03T00:00:00Z',
    net_revenue: 100000, total_cogs: 60000, gross_profit: 40000,
  },
]

const mockVariantsData = {
  results: [{ id: 'v1', sku_variant_code: 'SKU-001-M', name: 'Blue / M', product_name: 'Test Product', is_active: true }],
  count: 1, next: null, previous: null,
}

const mockAvgSalesData = {
  days: 30,
  date_from: '2026-04-27',
  results: [
    {
      variant_id: 'v1', sku_variant_code: 'SKU-001-M',
      variant_name: 'Blue / M', avg_sales_per_day: 2.5,
      total_qty_sold: 75, days: 30,
    },
  ],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <SalesDashboardPage />
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never

it('renders "Sales Dashboard" heading', () => {
  vi.mocked(useSalesOrdersFiltered).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(null))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(null))
  renderPage()
  expect(screen.getByText('Sales Dashboard')).toBeInTheDocument()
})

it('renders total orders stat (3)', () => {
  vi.mocked(useSalesOrdersFiltered).mockImplementation(() => hookResult({ results: mockOrders, count: 3, next: null, previous: null }))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(null))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(null))
  renderPage()
  expect(screen.getByText('3')).toBeInTheDocument()
})

it('renders cancellation rate (33.3%)', () => {
  vi.mocked(useSalesOrdersFiltered).mockImplementation(() => hookResult({ results: mockOrders, count: 3, next: null, previous: null }))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(null))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(null))
  renderPage()
  expect(screen.getByText('33.3%')).toBeInTheDocument()
})

it('renders SKU code in SKU tab', async () => {
  vi.mocked(useSalesOrdersFiltered).mockImplementation(() => hookResult({ results: mockOrders, count: 3, next: null, previous: null }))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(mockAvgSalesData))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariantsData))
  renderPage()
  const skuTab = screen.getByText('SKU Performance')
  await userEvent.click(skuTab)
  expect(await screen.findByText('SKU-001-M')).toBeInTheDocument()
})

it('renders order number in Order List tab', () => {
  vi.mocked(useSalesOrdersFiltered).mockImplementation(() => hookResult({ results: mockOrders, count: 3, next: null, previous: null }))
  vi.mocked(useAvgSales).mockReturnValue(hookResult(null))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(null))
  renderPage()
  expect(screen.getByText('ORD-001')).toBeInTheDocument()
})
