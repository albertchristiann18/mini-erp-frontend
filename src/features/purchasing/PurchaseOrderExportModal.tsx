import { Suspense, lazy, useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import type { PurchaseOrder } from '../../types/purchasing'
import { groupBySubGroup, fetchPhotoViaProxy } from './purchaseOrderPDFUtils'
import type { SubGroup } from './purchaseOrderPDFUtils'

const PDFContent = lazy(() => import('./PurchaseOrderExportPDF'))

interface Props {
  open: boolean
  onClose: () => void
  po: PurchaseOrder
}

export function PurchaseOrderExportModal({ open, onClose, po }: Props) {
  const allSubGroups = useMemo(
    () => groupBySubGroup(po.order_details ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [po.id],
  )

  const [deselectedKeys, setDeselectedKeys] = useState<Set<string>>(new Set())

  const selectedKeys = useMemo(
    () => new Set(allSubGroups.filter(sg => !deselectedKeys.has(sg.key)).map(sg => sg.key)),
    [allSubGroups, deselectedKeys],
  )

  const [imageMap, setImageMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const uniqueProducts = [
      ...new Map(
        allSubGroups
          .filter(sg => sg.product_photo_url && sg.product_id)
          .map(sg => [sg.product_id, sg]),
      ).values(),
    ]
    if (uniqueProducts.length === 0) return

    let cancelled = false
    Promise.all(
      uniqueProducts.map(async sg => {
        const base64 = await fetchPhotoViaProxy(sg.product_id)
        return [sg.product_id, base64] as const
      }),
    ).then(entries => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const [id, base64] of entries) {
        if (base64) map[id] = base64
      }
      setImageMap(map)
    })
    return () => { cancelled = true }
  }, [open, po.id, allSubGroups])

  const filteredSubGroups = useMemo(
    () => allSubGroups.filter(sg => selectedKeys.has(sg.key)),
    [allSubGroups, selectedKeys],
  )

  const sidebarProducts = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ product_id: string; product_name: string }> = []
    for (const sg of allSubGroups) {
      if (!seen.has(sg.product_id)) {
        seen.add(sg.product_id)
        result.push({ product_id: sg.product_id, product_name: sg.product_name })
      }
    }
    return result
  }, [allSubGroups])

  const toggleSubGroup = useCallback((key: string, checked: boolean) => {
    setDeselectedKeys(prev => {
      const next = new Set(prev)
      if (checked) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleProduct = useCallback((productId: string, checked: boolean) => {
    const productSGs = allSubGroups.filter(sg => sg.product_id === productId)
    setDeselectedKeys(prev => {
      const next = new Set(prev)
      productSGs.forEach(sg => (checked ? next.delete(sg.key) : next.add(sg.key)))
      return next
    })
  }, [allSubGroups])

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Export PDF — {po.purchase_order_number}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          <aside className="w-52 shrink-0 border-r overflow-y-auto px-3 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Selection
            </p>
            <div className="space-y-0.5">
              {sidebarProducts.map(product => {
                const productSGs: SubGroup[] = allSubGroups.filter(
                  sg => sg.product_id === product.product_id,
                )
                const allChecked = productSGs.every(sg => selectedKeys.has(sg.key))
                const someChecked = productSGs.some(sg => selectedKeys.has(sg.key))
                const indeterminate = !allChecked && someChecked

                return (
                  <div key={product.product_id}>
                    <label className="flex items-center gap-1.5 py-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded shrink-0"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = indeterminate }}
                        onChange={e => toggleProduct(product.product_id, e.target.checked)}
                        aria-label={product.product_name}
                      />
                      <span className="text-sm font-medium truncate" title={product.product_name}>
                        {product.product_name}
                      </span>
                    </label>
                    {productSGs.map(sg => (
                      <label
                        key={sg.key}
                        className="flex items-center gap-1.5 pl-5 py-0.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded shrink-0"
                          checked={selectedKeys.has(sg.key)}
                          onChange={e => toggleSubGroup(sg.key, e.target.checked)}
                          aria-label={sg.first_dim_value || '(default)'}
                        />
                        <span
                          className="text-xs text-muted-foreground truncate"
                          title={sg.first_dim_value || '(default)'}
                        >
                          {sg.first_dim_value || '(default)'} ({sg.items.length})
                        </span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          </aside>

          <div className="flex-1 overflow-hidden">
            {open && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Generating PDF...
                  </div>
                }
              >
                <PDFContent
                  po={po}
                  subGroups={filteredSubGroups}
                  imageMap={imageMap}
                  onDownload={onClose}
                />
              </Suspense>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

