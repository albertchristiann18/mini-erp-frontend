/**
 * Finance domain query-key factories.
 *
 * Single source of truth for all finance query keys and invalidation targets.
 * Pass these factories to hand-written hooks and use them for invalidation.
 */
import { createQueryKeys } from './queryKeys'

export const expenseKeys = createQueryKeys('expenses')
export const expenseCategoryKeys = createQueryKeys('expense-categories')
export const accountsPayableKeys = createQueryKeys('accounts-payable')
export const accountsReceivableKeys = createQueryKeys('accounts-receivable')
export const cashTransactionKeys = createQueryKeys('cash-transactions')

// Report endpoints — volatile (always fresh)
export const dashboardKpiKeys = createQueryKeys('dashboard-kpis')
export const incomeStatementKeys = createQueryKeys('income-statement')
export const balanceSheetKeys = createQueryKeys('balance-sheet')
export const cashFlowKeys = createQueryKeys('cash-flow')
