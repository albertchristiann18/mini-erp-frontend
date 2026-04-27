import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart,
  DollarSign, ChevronDown, Boxes,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface NavItem {
  label: string
  to?: string
  icon: React.ReactNode
  children?: { label: string; to: string }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    label: 'Inventory', icon: <Package className="h-4 w-4" />,
    children: [
      { label: 'Products', to: '/inventory/products' },
      { label: 'Stock', to: '/inventory/stock' },
      { label: 'Warehouses', to: '/inventory/warehouses' },
    ],
  },
  {
    label: 'Purchasing', icon: <Boxes className="h-4 w-4" />,
    children: [{ label: 'Purchase Orders', to: '/purchasing/orders' }],
  },
  {
    label: 'Sales', icon: <ShoppingCart className="h-4 w-4" />,
    children: [
      { label: 'Sales Orders', to: '/sales/orders' },
      { label: 'Returns', to: '/sales/returns' },
    ],
  },
  {
    label: 'Finance', icon: <DollarSign className="h-4 w-4" />,
    children: [
      { label: 'Expenses', to: '/finance/expenses' },
      { label: 'Accounts Payable', to: '/finance/payable' },
      { label: 'Accounts Receivable', to: '/finance/receivable' },
      { label: 'Reports', to: '/finance/reports' },
    ],
  },
]

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-6 mt-1 space-y-1">
          {item.children?.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn('block rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold text-foreground">Mini ERP</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item =>
          item.to ? (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ) : (
            <NavGroup key={item.label} item={item} />
          )
        )}
      </nav>
    </aside>
  )
}
