import client from './client'
import type {
  AccountsPayable, AccountsReceivable, Expense, ExpenseCategory,
  DashboardKPIs, IncomeStatement, BalanceSheet, CashFlow, ExpenseSummary,
} from '../types/finance'

export const getExpenses = (params?: Record<string, string | number>) =>
  client.get<{ count: number; results: Expense[] }>('/expenses/', { params })

export const getExpenseCategories = () =>
  client.get<ExpenseCategory[]>('/expense-categories/')

export const getExpenseSummary = (params: { start_date: string; end_date: string; company_id: string }) =>
  client.get<ExpenseSummary[]>('/expenses/summary/', { params })

export const getAccountsPayable = (params?: Record<string, string>) =>
  client.get<AccountsPayable[]>('/accounts-payable/', { params })

export const recordPayment = (id: string, data: { amount: number; payment_method: string; payment_date: string; note?: string }) =>
  client.post(`/accounts-payable/${id}/record-payment/`, data)

export const getAccountsReceivable = (params?: Record<string, string>) =>
  client.get<AccountsReceivable[]>('/accounts-receivable/', { params })

export const settleReceivable = (id: string, data: { settled_amount: number }) =>
  client.post(`/accounts-receivable/${id}/settle/`, data)

export const getDashboardKPIs = (params: { company_id: string; start_date: string; end_date: string }) =>
  client.get<DashboardKPIs>('/finance/dashboard-kpis/', { params })

export const getIncomeStatement = (params: { company_id: string; start_date: string; end_date: string }) =>
  client.get<IncomeStatement>('/finance/income-statement/', { params })

export const getBalanceSheet = (params: { company_id: string; as_of_date: string }) =>
  client.get<BalanceSheet>('/finance/balance-sheet/', { params })

export const getCashFlow = (params: { company_id: string; start_date: string; end_date: string }) =>
  client.get<CashFlow>('/finance/cash-flow/', { params })
