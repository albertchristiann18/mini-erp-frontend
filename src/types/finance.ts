export type APStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type ARStatus = 'PENDING' | 'PARTIAL' | 'SETTLED'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'EWALLET' | 'CREDIT'

export interface PaymentRecord {
  id: string
  accounts_payable: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  note: string
  cdate: string
}

export interface AccountsPayable {
  id: string
  company: string
  purchase_order: string
  purchase_order_number: string
  supplier_name: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: APStatus
  due_date: string | null
  payment_records: PaymentRecord[]
  cdate: string
  udate: string
}

export interface AccountsReceivable {
  id: string
  company: string
  sales_order: string
  order_number: string
  expected_amount: number
  settled_amount: number
  status: ARStatus
  due_date: string | null
  cdate: string
  udate: string
}

export interface ExpenseCategory {
  id: string
  company: string
  name: string
  description: string
  is_active: boolean
  cdate: string
  udate: string
}

export interface Expense {
  id: string
  company: string
  expense_number: string
  category: string
  category_name: string
  description: string
  amount: number
  expense_date: string
  payment_method: PaymentMethod
  is_recurring: boolean
  note: string
  cdate: string
  udate: string
}

export interface DashboardKPIs {
  total_revenue: number
  total_expenses: number
  gross_profit: number
  net_profit: number
  outstanding_payables: number
  outstanding_receivables: number
  total_orders: number
  monthly_revenue: Array<{ month: string; revenue: number; expenses: number }>
}

export interface IncomeStatement {
  period: { start: string; end: string }
  revenue: number
  cogs: number
  gross_profit: number
  total_expenses: number
  net_profit: number
  expense_breakdown: Array<{ category__name: string; total_amount: number }>
}

export interface BalanceSheet {
  as_of_date: string
  assets: { cash: number; receivables: number; inventory_value: number; total: number }
  liabilities: { payables: number; total: number }
  equity: number
}

export interface CashFlow {
  period: { start: string; end: string }
  operating: { collections: number; payments: number; net: number }
  net_cash_flow: number
}

export interface ExpenseSummary {
  category__name: string
  total_amount: number
  count: number
}
