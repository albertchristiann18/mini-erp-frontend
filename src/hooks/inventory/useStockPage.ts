/**
 * useStockPage — state machine for StockPage.
 *
 * Owns: warehouse-select, search/pagination, staging state (pending,
 * rowInputs, rowTypes, selected), stageChange/unstage/clearAll/applyBulkEdit,
 * saveChanges, selection toggles (toggleSelect/toggleSelectAll), and all
 * derived values (pendingIds, selectedPendingIds, selectedVariants, etc.).
 *
 * Components receive a view-model slice + callbacks; they never call api/ directly.
 */
import { useState, useEffect } from 'react'
import { useProductVariantStocks, useWarehouses, useAdjustStock } from '../api/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../lib/toast'
import type { ProductVariantStock, Warehouse, PaginatedResponse } from '../../types/inventory'
import type { ApiError } from '../../lib/errors'
import { type AdjustType, type PendingChange, computePreview } from './stockHelpers'

export type { AdjustType, PendingChange }
export { computePreview }

export interface UseStockPageResult {
  // auth
  isStaff: boolean

  // warehouse
  selectedWarehouse: string
  setSelectedWarehouse: (id: string) => void
  warehouses: Warehouse[]

  // search / pagination
  page: number
  setPage: (p: number) => void
  searchInput: string
  setSearchInput: (v: string) => void
  commitSearch: () => void

  // query data
  data: PaginatedResponse<ProductVariantStock> | undefined
  isLoading: boolean
  isError: boolean
  error: ApiError | null
  totalPages: number
  canEdit: boolean

  // staging
  pending: Record<string, PendingChange>
  rowInputs: Record<string, string>
  rowTypes: Record<string, AdjustType>
  setRowInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  stageChange: (v: ProductVariantStock, type: AdjustType) => void
  unstage: (variantId: string) => void
  clearAll: () => void
  applyBulkEdit: (type: AdjustType, qty: number) => void
  saveChanges: (variantIds: string[]) => Promise<void>

  // selection
  selected: Set<string>
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  allOnPageSelected: boolean

  // derived
  pendingIds: string[]
  selectedIds: string[]
  selectedPendingIds: string[]
  selectedVariants: ProductVariantStock[]

  // query actions
  refetch: () => void

  // mutation
  adjustIsPending: boolean

  // bulk edit modal
  showBulkEditModal: boolean
  setShowBulkEditModal: (v: boolean) => void
}

export function useStockPage(): UseStockPageResult {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)

  const [pending, setPending] = useState<Record<string, PendingChange>>({})
  const [rowInputs, setRowInputs] = useState<Record<string, string>>({})
  const [rowTypes, setRowTypes] = useState<Record<string, AdjustType>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const commitSearch = () => {
    setSearch(searchInput)
    setPage(1)
    setSelected(new Set())
  }

  const { data: warehousesData } = useWarehouses()
  const warehouses = warehousesData?.results ?? []

  useEffect(() => {
    if (warehouses.length === 1 && !selectedWarehouse) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedWarehouse(warehouses[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses])

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  if (selectedWarehouse) params.warehouse = selectedWarehouse

  const { data, isLoading, isError, error, refetch } = useProductVariantStocks(params)
  const adjustMutation = useAdjustStock()

  const totalPages = data ? Math.ceil(data.count / 20) : 1
  const canEdit = !!selectedWarehouse

  // ── staging ──────────────────────────────────────────────────────────────────

  const stageChange = (v: ProductVariantStock, type: AdjustType) => {
    setRowTypes(prev => ({ ...prev, [v.id]: type }))
  }

  const unstage = (variantId: string) => {
    setPending(prev => { const n = { ...prev }; delete n[variantId]; return n })
    setRowInputs(prev => { const n = { ...prev }; delete n[variantId]; return n })
    setRowTypes(prev => { const n = { ...prev }; delete n[variantId]; return n })
  }

  const clearAll = () => { setPending({}); setRowInputs({}); setRowTypes({}); setSelected(new Set()) }

  // Apply bulk edit from modal — stages changes for all selected variants
  const applyBulkEdit = (type: AdjustType, qty: number) => {
    if (!data) return
    const variants = data.results.filter(v => selected.has(v.id))
    setPending(prev => {
      const next = { ...prev }
      variants.forEach(v => {
        next[v.id] = { variantId: v.id, variantName: v.name, productName: v.product_name, currentQty: v.physical_qty, type, qty }
      })
      return next
    })
    toast.success(`Staged for ${variants.length} variant${variants.length !== 1 ? 's' : ''}`)
  }

  // ── save ──────────────────────────────────────────────────────────────────────

  const saveChanges = async (variantIds: string[]) => {
    if (!selectedWarehouse) return
    const toSave = variantIds.filter(id => rowTypes[id] !== undefined || pending[id])
    if (toSave.length === 0) { toast.error('No staged changes to save'); return }

    let ok = 0, fail = 0
    for (const id of toSave) {
      try {
        if (rowTypes[id] !== undefined) {
          const qty = parseInt(rowInputs[id] ?? '')
          if (isNaN(qty) || qty < 0) { fail++; continue }
          await adjustMutation.mutateAsync({ variant_id: id, warehouse_id: selectedWarehouse, type: rowTypes[id], qty })
        } else if (pending[id]) {
          const c = pending[id]
          await adjustMutation.mutateAsync({ variant_id: c.variantId, warehouse_id: selectedWarehouse, type: c.type, qty: c.qty })
        }
        ok++
      } catch { fail++ }
    }

    if (ok > 0) toast.success(`Saved ${ok} change${ok > 1 ? 's' : ''}`)
    if (fail > 0) toast.error(`${fail} change${fail > 1 ? 's' : ''} failed`)

    setRowTypes(prev => { const n = { ...prev }; toSave.forEach(id => delete n[id]); return n })
    setPending(prev => { const n = { ...prev }; toSave.forEach(id => delete n[id]); return n })
    setRowInputs(prev => { const n = { ...prev }; toSave.forEach(id => delete n[id]); return n })
    setSelected(prev => { const n = new Set(prev); toSave.forEach(id => n.delete(id)); return n })
    refetch()
  }

  // ── selection ─────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const clearSelection = () => setSelected(new Set())

  const toggleSelectAll = () => {
    if (!data) return
    const ids = data.results.map(v => v.id)
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      if (allSel) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id))
      return n
    })
  }

  const allOnPageSelected = (data?.results.length ?? 0) > 0 && (data?.results.every(v => selected.has(v.id)) ?? false)
  const selectedIds = [...selected]
  const rowTypePendingIds = Object.keys(rowTypes).filter(id => {
    const qty = parseInt(rowInputs[id] ?? '')
    return !isNaN(qty) && qty >= 0
  })
  const pendingIds = [...new Set([...Object.keys(pending), ...rowTypePendingIds])]
  const selectedPendingIds = selectedIds.filter(id => pending[id])
  const selectedVariants = data?.results.filter(v => selected.has(v.id)) ?? []

  return {
    isStaff: !!user?.is_staff,
    selectedWarehouse,
    setSelectedWarehouse,
    warehouses,
    page,
    setPage,
    searchInput,
    setSearchInput,
    commitSearch,
    data,
    isLoading,
    isError,
    error: (error as ApiError | null) ?? null,
    totalPages,
    canEdit,
    pending,
    rowInputs,
    rowTypes,
    setRowInputs,
    stageChange,
    unstage,
    clearAll,
    applyBulkEdit,
    saveChanges,
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    allOnPageSelected,
    pendingIds,
    selectedIds,
    selectedPendingIds,
    selectedVariants,
    refetch,
    adjustIsPending: adjustMutation.isPending,
    showBulkEditModal,
    setShowBulkEditModal,
  }
}
