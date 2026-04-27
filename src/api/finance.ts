import client from './client'
import type {
  AccountsPayable, AccountsReceivable, Expense, ExpenseCategory,
  DashboardKPIs, IncomeStatement, BalanceSheet, CashFlow, ExpenseSummary,
} from '../types/finance'
import type { PaginatedResponse } from '../types/inventory'

export const getExpenses = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Expense>>('/expenses/', { params })

export const createExpense = (data: unknown) =>
  client.post<Expense>('/expenses/', data)

export const updateExpense = (id: string, data: unknown) =>
  client.patch<Expense>(`/expenses/${id}/`, data)

export const deleteExpense = (id: string) =>
  client.delete(`/expenses/${id}/`)

export const getExpenseCategories = () =>
  client.get<PaginatedResponse<ExpenseCategory>>('/expense-categories/')

export const getExpenseSummary = (params: { start_date: string; end_date: string; company_id: string }) =>
  client.get<ExpenseSummary[]>('/expenses/summary/', { params })

export const getAccountsPayable = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<AccountsPayable>>('/accounts-payable/', { params })

export const recordPayment = (id: string, data: { amount: number; payment_method: string; payment_date: string; note?: string }) =>
  client.post(`/accounts-payable/${id}/record-payment/`, data)

export const getAccountsReceivable = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<AccountsReceivable>>('/accounts-receivable/', { params })

export const settleReceivable = (id: string, data: { settled_amount: number }) =>
  client.post(`/accounts-receivable/${id}/settle/`, data)

export const getDashboardKPIs = (params: { company_id: string; start_date: string; end_date: string }) =>
  client.get<DashboardKPIs>('/reports/dashboard/', { params })

export const getIncomeStatement = (params: { company_id: string; start_date: string; end_date: string }) =>
  client.get<IncomeStatement>('/reports/income-statement/', { params })

export const getBalanceSheet = (params: { company_id: string; as_of_date: string }) =>
  client.get<BalanceSheet>('/reports/balance-sheet/', { params })

export const getCashFlow = (params: { company_id: string; start_date: string; end_date: string }) =>
  client.get<CashFlow>('/reports/cash-flow/', { params })
