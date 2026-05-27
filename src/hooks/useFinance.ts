import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getExpenseCategories,
  getAccountsPayable, recordPayment,
  getAccountsReceivable, settleReceivable,
  getDashboardKPIs, getIncomeStatement, getBalanceSheet, getCashFlow,
  getCashTransactions, createCashTransaction, updateCashTransaction, deleteCashTransaction,
} from '../api/finance'
import type { CashTransactionCreate } from '../types/finance'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_COMPANY = import.meta.env.VITE_DEFAULT_COMPANY_ID || ''

export const useExpenses = (params: Record<string, string | number> = {}) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => getExpenses({ company_id: companyId, page_size: 20, ...params }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: !!companyId,
  })
}

export const useCreateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createExpense(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export const useUpdateExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateExpense(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export const useDeleteExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export const useExpenseCategories = () =>
  useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => getExpenseCategories().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useAccountsPayable = (page = 1) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['accounts-payable', page],
    queryFn: () => getAccountsPayable({ company_id: companyId, page, page_size: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: !!companyId,
  })
}

export const useRecordPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof recordPayment>[1] }) =>
      recordPayment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts-payable'] }),
  })
}

export const useAccountsReceivable = (page = 1) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['accounts-receivable', page],
    queryFn: () => getAccountsReceivable({ company_id: companyId, page, page_size: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: !!companyId,
  })
}

export const useSettleReceivable = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { settled_amount: number } }) =>
      settleReceivable(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts-receivable'] }),
  })
}

export const useDashboardKPIs = (startDate: string, endDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['dashboard-kpis', startDate, endDate],
    queryFn: () => getDashboardKPIs({ company_id: companyId, start_date: startDate, end_date: endDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate && !!companyId,
  })
}

export const useIncomeStatement = (startDate: string, endDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: () => getIncomeStatement({ company_id: companyId, start_date: startDate, end_date: endDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate && !!companyId,
  })
}

export const useBalanceSheet = (asOfDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: () => getBalanceSheet({ company_id: companyId, as_of_date: asOfDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!asOfDate && !!companyId,
  })
}

export const useCashFlow = (startDate: string, endDate: string) => {
  const { user } = useAuth()
  const companyId = user?.company_id || DEFAULT_COMPANY
  return useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: () => getCashFlow({ company_id: companyId, start_date: startDate, end_date: endDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate && !!companyId,
  })
}

export const useCashTransactions = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['cash-transactions', params],
    queryFn: () => getCashTransactions({ page_size: 200, ...params }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useCreateCashTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CashTransactionCreate) => createCashTransaction(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-transactions'] }),
  })
}

export const useUpdateCashTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CashTransactionCreate> }) =>
      updateCashTransaction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-transactions'] }),
  })
}

export const useDeleteCashTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCashTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-transactions'] }),
  })
}
