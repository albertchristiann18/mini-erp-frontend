import type { Dispatch, SetStateAction } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Pencil } from 'lucide-react'
import type { ProductSupplier, PaginatedResponse } from '../../../types/inventory'

export interface SuppliersSectionProps {
  productSuppliersData: PaginatedResponse<ProductSupplier> | undefined
  isStaff: boolean
  editingSupplierLinkId: string | null
  editingSupplierLink: string
  setEditingSupplierLinkId: Dispatch<SetStateAction<string | null>>
  setEditingSupplierLink: Dispatch<SetStateAction<string>>
  onSaveSupplierLink: () => void
  updateSupplierLinkIsPending: boolean
}

export function SuppliersSection({
  productSuppliersData,
  isStaff,
  editingSupplierLinkId,
  editingSupplierLink,
  setEditingSupplierLinkId,
  setEditingSupplierLink,
  onSaveSupplierLink,
  updateSupplierLinkIsPending,
}: SuppliersSectionProps) {
  const suppliers = productSuppliersData?.results ?? []

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b font-semibold">Suppliers</div>
        <div className="p-4">
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers linked</p>
          ) : (
            <div className="space-y-2">
              {suppliers.map(ps => (
                <div key={ps.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{ps.supplier_name}</span>
                  <div className="flex items-center gap-2">
                    {ps.supplier_link ? (
                      <a
                        href={ps.supplier_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs truncate max-w-[200px]"
                      >
                        {ps.supplier_link}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">No link</span>
                    )}
                    {isStaff && (
                      <button
                        type="button"
                        data-testid={`edit-supplier-link-${ps.id}`}
                        onClick={() => {
                          setEditingSupplierLinkId(ps.id)
                          setEditingSupplierLink(ps.supplier_link ?? '')
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!editingSupplierLinkId}
        onOpenChange={(open) => { if (!open) setEditingSupplierLinkId(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Supplier Link</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={editingSupplierLink}
              onChange={(e) => setEditingSupplierLink(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveSupplierLink() }}
            />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to clear the link.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSupplierLinkId(null)}>
              Cancel
            </Button>
            <Button onClick={onSaveSupplierLink} disabled={updateSupplierLinkIsPending}>
              {updateSupplierLinkIsPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
