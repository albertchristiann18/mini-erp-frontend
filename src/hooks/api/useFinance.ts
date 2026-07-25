import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getExpenseCategories,
  getAccountsPayable, recordPayment,
  getAccountsReceivable, settleReceivable,
  getDashboardKPIs, getIncomeStatement, getBalanceSheet, getCashFlow,
  getCashTransactions, createCashTransaction, updateCashTransaction, deleteCashTransaction,
} from '../../api/finance'
import type { CashTransactionCreate } from '../../types/finance'
import { useAuth } from '../../contexts/AuthContext'
import {
  expenseKeys,
  expenseCategoryKeys,
  accountsPayableKeys,
  accountsReceivableKeys,
  cashTransactionKeys,
  dashboardKpiKeys,
  incomeStatementKeys,
  balanceSheetKeys,
  cashFlowKeys,
} from '../../lib/financeKeys'

const DEFAULT_COMPANY = import.meta.env.VITE_DEFAULT_COMPANY_ID || ''

// staleTime tiers
const STALE_REFERENCE = 1000 * 60 * 10  // 10 min — expense categories (reference data)
const STALE_VOLATILE = 0                  // always fresh — report aggregates, cash transactions

export const useExpenses = (params: Record<string, string | number> = {}) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: expenseKeys.list({ company_id: companyId, ...params }),
    queryFn: () => getExpenses({ company_id: companyId, page_size: 20, ...params }),
    enabled: !!companyId,
  })
}

export const useCreateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createExpense(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.lists() }),
  })
}

export const useUpdateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateExpense(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.lists() }),
  })
}

export const useDeleteExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.lists() }),
  })
}

export const useExpenseCategories = () =>
  useQuery({
    queryKey: expenseCategoryKeys.all(),
    queryFn: () => getExpenseCategories(),
    staleTime: STALE_REFERENCE,
  })

export const useAccountsPayable = (page = 1) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: accountsPayableKeys.list({ company_id: companyId, page }),
    queryFn: () => getAccountsPayable({ company_id: companyId, page, page_size: 20 }),
    enabled: !!companyId,
  })
}

export const useRecordPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof recordPayment>[1] }) =>
      recordPayment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsPayableKeys.lists() }),
  })
}

export const useAccountsReceivable = (page = 1) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: accountsReceivableKeys.list({ company_id: companyId, page }),
    queryFn: () => getAccountsReceivable({ company_id: companyId, page, page_size: 20 }),
    enabled: !!companyId,
  })
}

export const useSettleReceivable = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { settled_amount: number } }) =>
      settleReceivable(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsReceivableKeys.lists() }),
  })
}

export const useDashboardKPIs = (startDate: string, endDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: dashboardKpiKeys.list({ company_id: companyId, startDate, endDate }),
    queryFn: () => getDashboardKPIs({ company_id: companyId, start_date: startDate, end_date: endDate }),
    enabled: !!startDate && !!endDate && !!companyId,
    staleTime: STALE_VOLATILE,
  })
}

export const useIncomeStatement = (startDate: string, endDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: incomeStatementKeys.list({ company_id: companyId, startDate, endDate }),
    queryFn: () => getIncomeStatement({ company_id: companyId, start_date: startDate, end_date: endDate }),
    enabled: !!startDate && !!endDate && !!companyId,
    staleTime: STALE_VOLATILE,
  })
}

export const useBalanceSheet = (asOfDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: balanceSheetKeys.list({ company_id: companyId, asOfDate }),
    queryFn: () => getBalanceSheet({ company_id: companyId, as_of_date: asOfDate }),
    enabled: !!asOfDate && !!companyId,
    staleTime: STALE_VOLATILE,
  })
}

export const useCashFlow = (startDate: string, endDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: cashFlowKeys.list({ company_id: companyId, startDate, endDate }),
    queryFn: () => getCashFlow({ company_id: companyId, start_date: startDate, end_date: endDate }),
    enabled: !!startDate && !!endDate && !!companyId,
    staleTime: STALE_VOLATILE,
  })
}

export const useCashTransactions = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: cashTransactionKeys.list(params),
    queryFn: () => getCashTransactions({ page_size: 200, ...params }),
    staleTime: STALE_VOLATILE,
  })

export const useCreateCashTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CashTransactionCreate) => createCashTransaction(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashTransactionKeys.lists() }),
  })
}

export const useUpdateCashTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CashTransactionCreate> }) =>
      updateCashTransaction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashTransactionKeys.lists() }),
  })
}

export const useDeleteCashTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCashTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashTransactionKeys.lists() }),
  })
}
