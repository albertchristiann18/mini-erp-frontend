import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductVariantStocks, useWarehouses, useAdjustStock } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Pagination } from '../../components/Pagination'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Upload, Save, X, RotateCcw, Layers } from 'lucide-react'
import { toast } from '../../lib/toast'
import type { ProductVariantStock } from '../../types/inventory'

type AdjustType = 'add' | 'min' | 'set'

interface PendingChange {
  variantId: string
  variantName: string
  productName: string
  currentQty: number
  type: AdjustType
  qty: number
}

function computePreview(current: number, type: AdjustType, qty: number): number {
  if (type === 'add') return current + qty
  if (type === 'min') return Math.max(0, current - qty)
  return qty
}

// ── Bulk Edit Modal ────────────────────────────────────────────────────────────

interface BulkEditModalProps {
  open: boolean
  onClose: () => void
  selectedVariants: ProductVariantStock[]
  onApply: (type: AdjustType, qty: number) => void
}

function BulkEditModal({ open, onClose, selectedVariants, onApply }: BulkEditModalProps) {
  const [type, setType] = useState<AdjustType>('add')
  const [qty, setQty] = useState('')
  const [showVariants, setShowVariants] = useState(false)

  const handleApply = () => {
    const parsed = parseInt(qty)
    if (isNaN(parsed) || parsed < 0) { toast.error('Enter a valid quantity'); return }
    onApply(type, parsed)
    setQty('')
    onClose()
  }

  const previewLabel = type === 'add' ? `+${qty || 0}` : type === 'min' ? `−${qty || 0}` : `= ${qty || 0}`

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Stock Edit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selected count toggle */}
          <button
            type="button"
            onClick={() => setShowVariants(v => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-left"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{showVariants ? 'Hide ▲' : 'Show ▼'}</span>
          </button>

          {showVariants && (
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y text-sm">
              {selectedVariants.map(v => {
                const parsed = parseInt(qty)
                const hasPreview = qty !== '' && !isNaN(parsed)
                const newQty = hasPreview ? computePreview(v.physical_qty, type, parsed) : null
                return (
                  <div key={v.id} className="flex items-center justify-between px-3 py-1.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{v.product_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{v.sku_variant_code}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0 tabular-nums">
                      <span className="text-muted-foreground">{v.physical_qty}</span>
                      {newQty !== null && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className={`font-semibold ${newQty !== v.physical_qty ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                            {newQty}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Adjustment type + qty */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Adjustment Type</label>
            <div className="flex gap-2">
              {(['add', 'min', 'set'] as AdjustType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-muted'
                  }`}
                >
                  {t === 'add' ? 'Add' : t === 'min' ? 'Minus' : 'Set'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min={0}
              placeholder="Enter quantity"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!qty || isNaN(parseInt(qty))}>
            Stage {previewLabel} for {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function StockPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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

  const { data, isLoading, refetch } = useProductVariantStocks(params)
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

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedWarehouse || 'all'} onValueChange={v => { setSelectedWarehouse(v === 'all' ? '' : v); clearAll() }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map(w => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            placeholder="Search by product name or SKU..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSearch()}
            className="w-[280px]"
          />
          <Button size="sm" variant="outline" onClick={commitSearch}>Search</Button>
        </div>

        <span className="text-sm text-muted-foreground">{data?.count ?? 0} variants</span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {pendingIds.length > 0 && (
            <>
              <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
                {pendingIds.length} unsaved
              </Badge>
              <Button size="sm" variant="outline" onClick={clearAll}>
                <RotateCcw className="h-3 w-3 mr-1" /> Discard All
              </Button>
              <Button size="sm" onClick={() => saveChanges(pendingIds)} disabled={adjustMutation.isPending}>
                <Save className="h-3 w-3 mr-1" /> Save All ({pendingIds.length})
              </Button>
            </>
          )}
          {user?.is_staff && (
            <Button size="sm" variant="outline" onClick={() => navigate('/inventory/bulk-stock-update')}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Update
            </Button>
          )}
        </div>
      </div>

      {/* ── Selection action bar (shown when rows are selected) ── */}
      {canEdit && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-2">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2 ml-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowBulkEditModal(true)}
            >
              <Layers className="h-3 w-3 mr-1" /> Bulk Edit Stock
            </Button>
            {selectedPendingIds.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => saveChanges(selectedPendingIds)}
                disabled={adjustMutation.isPending}
              >
                <Save className="h-3 w-3 mr-1" /> Save Selected ({selectedPendingIds.length})
              </Button>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground ml-auto"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-3 w-3 mr-1" /> Deselect All
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </TableHead>
              )}
              <TableHead>Product</TableHead>
              <TableHead>SKU Variant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              {canEdit && (
                <>
                  <TableHead className="text-center w-56">Change</TableHead>
                  <TableHead className="text-center w-24">Preview</TableHead>
                  <TableHead className="w-28" />
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 5} className="text-center text-muted-foreground py-10">Loading...</TableCell>
              </TableRow>
            ) : data?.results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 5} className="text-center text-muted-foreground py-10">No variants found</TableCell>
              </TableRow>
            ) : data?.results.map(v => {
              const hasLockedType = rowTypes[v.id] !== undefined
              const lockedType = rowTypes[v.id]
              const hasPending = !!pending[v.id]
              const isSelected = selected.has(v.id)

              const previewQty = hasLockedType ? (() => {
                const inputVal = rowInputs[v.id]
                const inputNum = parseInt(inputVal ?? '')
                return (!isNaN(inputNum) && inputNum >= 0)
                  ? computePreview(v.physical_qty, lockedType, inputNum)
                  : null
              })() : hasPending
                ? computePreview(v.physical_qty, pending[v.id].type, pending[v.id].qty)
                : null

              return (
                <TableRow
                  key={v.id}
                  className={
                    (hasLockedType || hasPending)
                      ? 'bg-yellow-50 dark:bg-yellow-950/20'
                      : isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/10'
                        : ''
                  }
                >
                  {canEdit && (
                    <TableCell>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(v.id)} className="rounded border-gray-300 cursor-pointer" />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{v.product_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{v.sku_variant_code}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{v.category_name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{v.physical_qty}</TableCell>

                  {canEdit && (
                    <>
                      <TableCell>
                        {hasLockedType ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              className="h-7 w-16 text-xs"
                              placeholder="Qty"
                              value={rowInputs[v.id] ?? ''}
                              onChange={e => setRowInputs(prev => ({ ...prev, [v.id]: e.target.value }))}
                            />
                            {lockedType === 'min' && (
                              <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 dark:text-red-400"
                                      onClick={() => stageChange(v, 'min')} title="Subtract">
                                −
                              </Button>
                            )}
                            {lockedType === 'set' && (
                              <Button size="icon" variant="outline" className="h-7 w-7 text-muted-foreground"
                                      onClick={() => stageChange(v, 'set')} title="Set to">
                                =
                              </Button>
                            )}
                            {lockedType === 'add' && (
                              <Button size="icon" variant="outline" className="h-7 w-7 text-green-600 dark:text-green-400"
                                      onClick={() => stageChange(v, 'add')} title="Add">
                                +
                              </Button>
                            )}
                          </div>
                        ) : hasPending ? (
                          <div className="flex justify-center">
                            <Badge variant="outline" className="font-mono text-xs">
                              {pending[v.id].type === 'add' ? `+${pending[v.id].qty}` : pending[v.id].type === 'min' ? `−${pending[v.id].qty}` : `=${pending[v.id].qty}`}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              className="h-7 w-16 text-xs"
                              placeholder="Qty"
                              value={rowInputs[v.id] ?? ''}
                              onChange={e => setRowInputs(prev => ({ ...prev, [v.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && stageChange(v, 'add')}
                            />
                            <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 dark:text-red-400"
                                    disabled={!rowInputs[v.id] || isNaN(parseInt(rowInputs[v.id] ?? ''))}
                                    onClick={() => stageChange(v, 'min')} title="Subtract">
                              −
                            </Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 text-muted-foreground"
                                    disabled={!rowInputs[v.id] || isNaN(parseInt(rowInputs[v.id] ?? ''))}
                                    onClick={() => stageChange(v, 'set')} title="Set to">
                              =
                            </Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 text-green-600 dark:text-green-400"
                                    disabled={!rowInputs[v.id] || isNaN(parseInt(rowInputs[v.id] ?? ''))}
                                    onClick={() => stageChange(v, 'add')} title="Add">
                              +
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center tabular-nums">
                        {previewQty !== null ? (
                          <span className={previewQty !== v.physical_qty ? 'font-semibold text-blue-600 dark:text-blue-400' : 'font-medium'}>
                            {previewQty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {(hasLockedType || hasPending) ? (
                            <>
                              <Button size="sm" className="h-7 text-xs"
                                      onClick={() => saveChanges([v.id])}
                                      disabled={adjustMutation.isPending || (hasLockedType && (isNaN(parseInt(rowInputs[v.id] ?? '')) || parseInt(rowInputs[v.id] ?? '') < 0))}>
                                <Save className="h-3 w-3 mr-1" /> Save
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unstage(v.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={p => { setPage(p); setSelected(new Set()) }} isLoading={isLoading} />

      {/* Modals */}
      <BulkEditModal
        open={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        selectedVariants={selectedVariants}
        onApply={applyBulkEdit}
      />
    </div>
  )
}
