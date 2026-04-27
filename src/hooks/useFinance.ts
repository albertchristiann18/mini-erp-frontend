import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getExpenseCategories,
  getAccountsPayable, recordPayment,
  getAccountsReceivable, settleReceivable,
  getDashboardKPIs, getIncomeStatement, getBalanceSheet, getCashFlow,
} from '../api/finance'

const DEFAULT_COMPANY = import.meta.env.VITE_DEFAULT_COMPANY_ID || '1'

export const useExpenses = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['expenses', params],
    queryFn: () => getExpenses({ page_size: 20, ...params }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

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

export const useAccountsPayable = (page = 1) =>
  useQuery({
    queryKey: ['accounts-payable', page],
    queryFn: () => getAccountsPayable({ page, page_size: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useRecordPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof recordPayment>[1] }) =>
      recordPayment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts-payable'] }),
  })
}

export const useAccountsReceivable = (page = 1) =>
  useQuery({
    queryKey: ['accounts-receivable', page],
    queryFn: () => getAccountsReceivable({ page, page_size: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useSettleReceivable = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { settled_amount: number } }) =>
      settleReceivable(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts-receivable'] }),
  })
}

export const useDashboardKPIs = (startDate: string, endDate: string) =>
  useQuery({
    queryKey: ['dashboard-kpis', startDate, endDate],
    queryFn: () => getDashboardKPIs({ company_id: DEFAULT_COMPANY, start_date: startDate, end_date: endDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate,
  })

export const useIncomeStatement = (startDate: string, endDate: string) =>
  useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: () => getIncomeStatement({ company_id: DEFAULT_COMPANY, start_date: startDate, end_date: endDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate,
  })

export const useBalanceSheet = (asOfDate: string) =>
  useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: () => getBalanceSheet({ company_id: DEFAULT_COMPANY, as_of_date: asOfDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!asOfDate,
  })

export const useCashFlow = (startDate: string, endDate: string) =>
  useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: () => getCashFlow({ company_id: DEFAULT_COMPANY, start_date: startDate, end_date: endDate }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate,
  })
