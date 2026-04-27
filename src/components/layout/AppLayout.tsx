import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const titleMap: Record<string, string> = {
  '/': 'Dashboard',
  '/inventory/products': 'Products',
  '/inventory/stock': 'Stock Movements',
  '/inventory/warehouses': 'Warehouses',
  '/purchasing/orders': 'Purchase Orders',
  '/sales/orders': 'Sales Orders',
  '/sales/returns': 'Returns',
  '/finance/expenses': 'Expenses',
  '/finance/payable': 'Accounts Payable',
  '/finance/receivable': 'Accounts Receivable',
  '/finance/reports': 'Financial Reports',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = titleMap[pathname] ?? 'Mini ERP'
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
