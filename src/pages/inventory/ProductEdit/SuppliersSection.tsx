import { X, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Loading, Empty } from '../../../components/ui/queryPrimitives'
import type { PaginatedResponse, ProductSupplier, Supplier } from '../../../types/inventory'
import type { SupplierMutationResult, DeleteSupplierMutationResult } from '../../../hooks/inventory/productEditHelpers'

interface SuppliersSectionProps {
  productSuppliersData: PaginatedResponse<ProductSupplier> | undefined
  suppliersLoading: boolean
  suppliersData: PaginatedResponse<Supplier> | undefined
  newSupplierSelectedId: string
  newSupplierLink: string
  supplierSearch: string
  showAttachSupplierModal: boolean
  createProductSupplierMutation: SupplierMutationResult
  deleteProductSupplierMutation: DeleteSupplierMutationResult
  setNewSupplierSelectedId: (v: string) => void
  setNewSupplierLink: (v: string) => void
  setSupplierSearch: (v: string) => void
  setShowAttachSupplierModal: (v: boolean) => void
  onAddProductSupplier: () => Promise<void>
}

export function SuppliersSection({
  productSuppliersData,
  suppliersLoading,
  suppliersData,
  newSupplierSelectedId,
  newSupplierLink,
  supplierSearch,
  showAttachSupplierModal,
  createProductSupplierMutation,
  deleteProductSupplierMutation,
  setNewSupplierSelectedId,
  setNewSupplierLink,
  setSupplierSearch,
  setShowAttachSupplierModal,
  onAddProductSupplier,
}: SuppliersSectionProps) {
  const closeModal = () => {
    setShowAttachSupplierModal(false)
    setNewSupplierSelectedId('')
    setNewSupplierLink('')
    setSupplierSearch('')
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Suppliers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Link one or more suppliers to this product. The linked supplier URL will be used when creating purchase orders.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowAttachSupplierModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Attach
        </Button>
      </div>

      {suppliersLoading ? (
        <Loading className="py-4" />
      ) : (productSuppliersData?.results ?? []).length === 0 ? (
        <Empty message="No suppliers linked yet." className="py-4" />
      ) : (
        <div className="space-y-2">
          {(productSuppliersData?.results ?? []).map(ps => (
            <div key={ps.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium shrink-0">{ps.supplier_name}</span>
                {ps.supplier_link && (
                  <a
                    href={ps.supplier_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline truncate"
                  >
                    {ps.supplier_link}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteProductSupplierMutation.mutate(ps.id)}
                className="text-muted-foreground hover:text-destructive ml-4 shrink-0"
                title="Remove supplier"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAttachSupplierModal} onOpenChange={(o) => { if (!o) closeModal() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Supplier</p>
              <Select value={newSupplierSelectedId} onValueChange={setNewSupplierSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1">
                    <Input
                      placeholder="Search..."
                      value={supplierSearch}
                      onChange={e => setSupplierSearch(e.target.value)}
                      className="h-7 text-xs"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  {(suppliersData?.results ?? []).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Supplier URL (optional)</p>
              <Input
                type="url"
                placeholder="https://..."
                value={newSupplierLink}
                onChange={e => setNewSupplierLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newSupplierSelectedId || createProductSupplierMutation.isPending}
              onClick={async () => {
                await onAddProductSupplier()
                setShowAttachSupplierModal(false)
              }}
            >
              {createProductSupplierMutation.isPending ? 'Attaching...' : 'Attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
