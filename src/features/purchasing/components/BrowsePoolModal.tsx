import { useState, useMemo, useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { toast } from '../../../lib/toast'
import { useSourcingPoolItems, useAddPoolItemsToPo, useResolveSkuConflicts } from '../hooks/useSourcingPool'
import { SkuConflictResolver } from './SkuConflictResolver'
import type { SourcingPoolItem, AddPoolItemsResult, ResolveSkuConflictsResult } from '../../../types/purchasing'

interface BrowsePoolModalProps {
  open: boolean
  onClose: () => void
  poId: string
  supplierId: string
}

type ModalView = 'browse' | 'preview' | 'resolve_conflicts' | 'result'

export function BrowsePoolModal({ open, onClose, poId, supplierId }: BrowsePoolModalProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<ModalView>('browse')
  const [addResult, setAddResult] = useState<AddPoolItemsResult | null>(null)
  const [resolveResult, setResolveResult] = useState<ResolveSkuConflictsResult | null>(null)
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, { action: 'add_to_existing' | 'skip'; product_id?: string }>>({})

  const { data: poolData, isLoading, isError } = useSourcingPoolItems(supplierId)
  const addPoolMutation = useAddPoolItemsToPo()
  const resolveConflictsMutation = useResolveSkuConflicts()

  const items = poolData?.items ?? []

  const groups = useMemo(() => {
    const map = new Map<string, { groupKey: string; productName: string | null; supplierLink: string | null; imageUrl: string | null; items: SourcingPoolItem[] }>()
    for (const item of items) {
      const groupKey = item.product_name ?? item.supplier_link ?? item.id
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          productName: item.product_name,
          supplierLink: item.supplier_link,
          imageUrl: item.image_proxy_url ?? item.image_url ?? null,
          items: [],
        })
      }
      map.get(groupKey)!.items.push(item)
    }
    return Array.from(map.values())
  }, [items])

  const handleClose = () => {
    setSelectedItemIds(new Set())
    setView('browse')
    setAddResult(null)
    setResolveResult(null)
    setConflictResolutions({})
    onClose()
  }

  const hasPreSelected = useRef(false)
  useEffect(() => {
    if (poolData?.items && !hasPreSelected.current) {
      hasPreSelected.current = true
      setSelectedItemIds(new Set(poolData.items.map((i) => i.id)))
    }
  }, [poolData?.items])

  useEffect(() => {
    if (view === 'result') {
      const totalAdded = (addResult?.added.length ?? 0) + (resolveResult?.added.length ?? 0)
      toast.success(`${totalAdded} item${totalAdded !== 1 ? 's' : ''} added to PO`)
    }
  }, [view, addResult, resolveResult])

  const totalAdded = (addResult?.added.length ?? 0) + (resolveResult?.added.length ?? 0)
  const allSkipped = [...(addResult?.skipped ?? []), ...(resolveResult?.skipped ?? [])]

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = (select: boolean) => {
    if (select) {
      setSelectedItemIds(new Set(items.map((i) => i.id)))
    } else {
      setSelectedItemIds(new Set())
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {view === 'browse' && 'Browse Sourcing Pool'}
            {view === 'preview' && 'Preview — Items to Add'}
            {view === 'resolve_conflicts' && 'SKU Conflicts'}
            {view === 'result' && 'Result'}
          </DialogTitle>
        </DialogHeader>

        {view === 'browse' && (
          <>
            {isLoading && <p className="text-muted-foreground">Loading pool items...</p>}
            {isError && <p className="text-red-500">Failed to load sourcing pool</p>}
            {!isLoading && !isError && items.length === 0 && (
              <p className="text-muted-foreground text-sm">No available pool items for this supplier.</p>
            )}
            {!isLoading && !isError && items.length > 0 && (
              <>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{groups.length} products · {items.length} variants</span>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => toggleAll(true)}>Select all</button>
                    <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => toggleAll(false)}>Deselect all</button>
                  </div>
                  <span className="font-medium">{selectedItemIds.size} selected</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {groups.map((group) => (
                    <div key={group.groupKey}>
                      <div className="flex items-center gap-2 py-1.5 px-1 bg-muted/30 rounded text-sm font-medium">
                        {group.imageUrl ? (
                          <img
                            src={group.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted shrink-0" />
                        )}
                        <span className="truncate">{group.productName ?? '(Unnamed)'}</span>
                        {group.supplierLink && (
                          <a href={group.supplierLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 shrink-0">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {group.items.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/10 rounded cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={selectedItemIds.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                          />
                          <span className="flex-1 truncate">{item.variant_name}</span>
                          <span className="text-muted-foreground w-16 text-right">
                            {[item.dim1_value, item.dim2_value].filter(Boolean).join(' · ') || '—'}
                          </span>
                          <span className="text-muted-foreground w-16 text-right">{item.unit_price}</span>
                          <span className="text-muted-foreground w-12 text-right">{item.qty_suggested ?? '—'}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button disabled={selectedItemIds.size === 0} onClick={() => setView('preview')}>
                Preview →
              </Button>
            </DialogFooter>
          </>
        )}

        {view === 'preview' && (
          <>
            <p className="text-sm text-muted-foreground">Review the items that will be added to the purchase order.</p>
            <div className="border rounded text-xs max-h-60 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Product</th>
                    <th className="px-2 py-1 text-left">SKU hint</th>
                    <th className="px-2 py-1 text-left">Variant</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter((i) => selectedItemIds.has(i.id)).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-2 py-1">{item.product_name ?? '(from supplier_link)'}</td>
                      <td className="px-2 py-1 font-mono">{item.variant_code ?? 'Auto'}</td>
                      <td className="px-2 py-1">{item.variant_name}</td>
                      <td className="px-2 py-1 text-right">{item.qty_suggested ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{item.unit_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setView('browse')}>← Back</Button>
              <Button
                disabled={addPoolMutation.isPending}
                onClick={() => {
                  addPoolMutation.mutate(
                    { poId, data: { item_ids: [...selectedItemIds], product_name_overrides: {}, dim_mismatch_resolutions: {} } },
                    {
                      onSuccess: (res) => {
                        setAddResult(res)
                        if (res.sku_conflicts.length > 0) {
                          setConflictResolutions(
                            Object.fromEntries(
                              res.sku_conflicts.map((c) => [
                                c.item_id,
                                { action: 'add_to_existing' as const, product_id: c.existing_product_id },
                              ])
                            )
                          )
                          setView('resolve_conflicts')
                        } else {
                          setView('result')
                        }
                      },
                      onError: () => toast.error('Failed to add items to PO. Please try again.'),
                    }
                  )
                }}>
                {addPoolMutation.isPending ? 'Adding...' : 'Confirm & Add to PO'}
              </Button>
            </DialogFooter>
          </>
        )}

        {view === 'resolve_conflicts' && addResult && (
          <SkuConflictResolver
            conflicts={addResult.sku_conflicts}
            resolutions={conflictResolutions}
            onResolutionChange={(itemId, resolution) => setConflictResolutions(prev => ({ ...prev, [itemId]: resolution }))}
            onConfirm={() => resolveConflictsMutation.mutate(
              {
                poId,
                data: {
                  resolutions: Object.entries(conflictResolutions).map(([item_id, r]) => ({
                    item_id,
                    action: r.action,
                    ...(r.action === 'add_to_existing' && r.product_id ? { product_id: r.product_id } : {}),
                  })),
                },
              },
              {
                onSuccess: (res) => { setResolveResult(res); setView('result') },
                onError: () => toast.error('Failed to resolve conflicts. Please try again.'),
              }
            )}
            isPending={resolveConflictsMutation.isPending}
          />
        )}

        {view === 'result' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{totalAdded} item{totalAdded !== 1 ? 's' : ''} added to PO</span>
            </div>
            {allSkipped.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  {allSkipped.length} item{allSkipped.length !== 1 ? 's' : ''} skipped
                </summary>
                <div className="mt-2 space-y-1">
                  {allSkipped.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{s.item_id}: {s.reason}</p>
                  ))}
                </div>
              </details>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
