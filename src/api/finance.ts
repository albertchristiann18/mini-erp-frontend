import { http } from '../lib/http'
import type {
  AccountsPayable, AccountsReceivable, Expense, ExpenseCategory,
  DashboardKPIs, IncomeStatement, BalanceSheet, CashFlow, ExpenseSummary,
  CashTransaction, CashTransactionCreate,
} from '../types/finance'
import type { PaginatedResponse } from '../types/inventory'

export const getExpenses = (params?: Record<string, string | number>): Promise<PaginatedResponse<Expense>> =>
  http.get<PaginatedResponse<Expense>>('/expenses/', { params })

export const createExpense = (data: unknown): Promise<Expense> =>
  http.post<Expense>('/expenses/', data)

export const updateExpense = (id: string, data: unknown): Promise<Expense> =>
  http.patch<Expense>(`/expenses/${id}/`, data)

export const deleteExpense = (id: string): Promise<unknown> =>
  http.delete(`/expenses/${id}/`)

export const getExpenseCategories = (): Promise<PaginatedResponse<ExpenseCategory>> =>
  http.get<PaginatedResponse<ExpenseCategory>>('/expense-categories/')

export const getExpenseSummary = (params: { start_date: string; end_date: string; company_id: string }): Promise<ExpenseSummary[]> =>
  http.get<ExpenseSummary[]>('/expenses/summary/', { params })

export const getAccountsPayable = (params?: Record<string, string | number>): Promise<PaginatedResponse<AccountsPayable>> =>
  http.get<PaginatedResponse<AccountsPayable>>('/accounts-payable/', { params })

export const recordPayment = (id: string, data: { amount: number; payment_method: string; payment_date: string; note?: string }): Promise<unknown> =>
  http.post(`/accounts-payable/${id}/record-payment/`, data)

export const getAccountsReceivable = (params?: Record<string, string | number>): Promise<PaginatedResponse<AccountsReceivable>> =>
  http.get<PaginatedResponse<AccountsReceivable>>('/accounts-receivable/', { params })

export const settleReceivable = (id: string, data: { settled_amount: number }): Promise<unknown> =>
  http.post(`/accounts-receivable/${id}/settle/`, data)

export const getDashboardKPIs = (params: { company_id: string; start_date: string; end_date: string }): Promise<DashboardKPIs> =>
  http.get<DashboardKPIs>('/reports/dashboard/', { params })

export const getIncomeStatement = (params: { company_id: string; start_date: string; end_date: string }): Promise<IncomeStatement> =>
  http.get<IncomeStatement>('/reports/income-statement/', { params })

export const getBalanceSheet = (params: { company_id: string; as_of_date: string }): Promise<BalanceSheet> =>
  http.get<BalanceSheet>('/reports/balance-sheet/', { params })

export const getCashFlow = (params: { company_id: string; start_date: string; end_date: string }): Promise<CashFlow> =>
  http.get<CashFlow>('/reports/cash-flow/', { params })

export const getCashTransactions = (params?: Record<string, string | number>): Promise<PaginatedResponse<CashTransaction>> =>
  http.get<PaginatedResponse<CashTransaction>>('/cash-transactions/', { params })

export const createCashTransaction = (data: CashTransactionCreate): Promise<CashTransaction> =>
  http.post<CashTransaction>('/cash-transactions/', data)

export const updateCashTransaction = (id: string, data: Partial<CashTransactionCreate>): Promise<CashTransaction> =>
  http.patch<CashTransaction>(`/cash-transactions/${id}/`, data)

export const deleteCashTransaction = (id: string): Promise<unknown> =>
  http.delete(`/cash-transactions/${id}/`)
