import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const titleMap: Record<string, string> = {
  '/': 'Dashboard',
  '/inventory/products': 'Products',
  '/inventory/stock': 'Stock',
  '/inventory/stock-closing': 'Stock Closing Report',
  '/inventory/warehouses': 'Warehouses',
  '/inventory/inventory-dashboard': 'Inventory Dashboard',
  '/inventory/bulk-stock-update': 'Bulk Stock Update',
  '/purchasing/orders': 'Purchase Orders',
  '/purchasing/replenishment': 'Replenishment Planning',
  '/sales/dashboard': 'Sales Dashboard',
  '/sales/orders': 'Sales Orders',
  '/sales/returns': 'Returns',
  '/finance/expenses': 'Expenses',
  '/finance/payable': 'Accounts Payable',
  '/finance/receivable': 'Accounts Receivable',
  '/finance/reports': 'Financial Reports',
  '/finance/cash-transactions': 'Cash Transactions',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = titleMap[pathname]
    ?? (pathname.startsWith('/purchasing/orders/') ? 'PO Detail' : 'Mini ERP')
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6 overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
