import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { useVariantSearch } from '../../hooks/api/useInventory'
import type { ExcelImportUnmatchedSku, ExcelImportSkuMapping } from './types'

interface SkuResolutionModalProps {
  open: boolean
  onClose: () => void
  unmatchedSkus: ExcelImportUnmatchedSku[]
  onConfirm: (mappings: ExcelImportSkuMapping[]) => void
}

export function SkuResolutionModal({ open, onClose, unmatchedSkus, onConfirm }: SkuResolutionModalProps) {
  const [activeRow, setActiveRow] = useState<string | null>(null)
  const [activeSearch, setActiveSearch] = useState('')
  const [selection, setSelection] = useState<Record<string, string | 'skip'>>({})
  const [selectedDisplay, setSelectedDisplay] = useState<Record<string, string>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: searchData, isLoading: searchLoading } =
    useVariantSearch({ search: activeSearch, page_size: 10 }, !!activeSearch)
  const searchResults = searchData?.results ?? []

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const allResolved = unmatchedSkus.every(u => selection[u.shopee_sku] !== undefined)

  const handleConfirm = () => {
    const mappings = unmatchedSkus
      .filter(u => selection[u.shopee_sku] && selection[u.shopee_sku] !== 'skip')
      .map(u => ({ shopee_sku: u.shopee_sku, variant_id: selection[u.shopee_sku] as string }))
    onConfirm(mappings)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve Unmatched SKU Codes</DialogTitle>
          <p className="text-sm text-muted-foreground">
            These SKU codes from the file were not found in the system. Map each to a variant or skip it.
          </p>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2 font-medium">Shopee SKU</th>
                <th className="p-2 font-medium">Product Name</th>
                <th className="p-2 font-medium">Map to Variant</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedSkus.map((sku) => (
                <tr key={sku.shopee_sku} className="border-b">
                  <td className="p-2">
                    <code className="text-xs font-mono">{sku.shopee_sku}</code>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{sku.product_name}</td>
                  <td className="p-2">
                    {selection[sku.shopee_sku] && selection[sku.shopee_sku] !== 'skip' ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">{selectedDisplay[sku.shopee_sku]}</Badge>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelection(prev => { const next = { ...prev }; delete next[sku.shopee_sku]; return next })
                            setSelectedDisplay(prev => { const next = { ...prev }; delete next[sku.shopee_sku]; return next })
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ) : selection[sku.shopee_sku] === 'skip' ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Skipped</Badge>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelection(prev => { const next = { ...prev }; delete next[sku.shopee_sku]; return next })
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Input
                          type="text"
                          placeholder="Search variant..."
                          onFocus={() => setActiveRow(sku.shopee_sku)}
                          onChange={(e) => {
                            const value = e.target.value
                            setActiveRow(sku.shopee_sku)
                            if (timerRef.current) clearTimeout(timerRef.current)
                            timerRef.current = setTimeout(() => setActiveSearch(value), 300)
                          }}
                          onBlur={() => {
                            if (timerRef.current) clearTimeout(timerRef.current)
                          }}
                        />
                        {activeRow === sku.shopee_sku && (
                          <div className="mt-1">
                            {searchLoading && (
                              <p className="text-xs text-muted-foreground">Searching...</p>
                            )}
                            {!searchLoading && activeSearch && searchResults.length === 0 && (
                              <p className="text-xs text-muted-foreground">No variants found</p>
                            )}
                            {searchResults.length > 0 && (
                              <ul className="space-y-1 max-h-40 overflow-y-auto">
                                {searchResults.map((result) => (
                                  <li key={result.id}>
                                    <button
                                      type="button"
                                      className="text-xs text-left w-full px-2 py-1 rounded hover:bg-accent"
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        setSelection(prev => ({ ...prev, [sku.shopee_sku]: result.id }))
                                        setSelectedDisplay(prev => ({ ...prev, [sku.shopee_sku]: result.sku_variant_code }))
                                        setActiveSearch('')
                                        setActiveRow(null)
                                      }}
                                    >
                                      {result.sku_variant_code} — {result.name} ({result.product_name})
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground mt-1"
                          onClick={() => setSelection(prev => ({ ...prev, [sku.shopee_sku]: 'skip' }))}
                        >
                          Skip this item
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!allResolved}>
            Confirm Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
