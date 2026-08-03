import { X, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
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
import { toast } from '../../../lib/toast'
import type { ProductBusinessEntity, BusinessEntity } from '../../../types/inventory'
import type { AttachBEMutationResult, DetachBEMutationResult } from '../../../hooks/inventory/productEditHelpers'

interface BusinessEntitiesSectionProps {
  assignments: ProductBusinessEntity[]
  availableBEs: BusinessEntity[]
  attachedMarketplaceIds: Set<string>
  showAttachBEModal: boolean
  attachingBEId: string
  attachBEMutation: AttachBEMutationResult
  detachBEMutation: DetachBEMutationResult
  setShowAttachBEModal: (v: boolean) => void
  setAttachingBEId: (v: string) => void
}

export function BusinessEntitiesSection({
  assignments,
  availableBEs,
  attachedMarketplaceIds,
  showAttachBEModal,
  attachingBEId,
  attachBEMutation,
  detachBEMutation,
  setShowAttachBEModal,
  setAttachingBEId,
}: BusinessEntitiesSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Business Entities</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attach this product to one or more business entities. One entity per marketplace allowed.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowAttachBEModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Attach
        </Button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No business entities attached yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.business_entity_name}</span>
                <Badge variant="outline" className="text-xs">{a.marketplace_name}</Badge>
              </div>
              <button
                type="button"
                onClick={() =>
                  detachBEMutation.mutate(a.id, {
                    onSuccess: () => toast.success('Detached'),
                    onError: () => toast.error('Failed to detach'),
                  })
                }
                className="text-muted-foreground hover:text-destructive ml-4"
                title="Remove business entity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAttachBEModal} onOpenChange={setShowAttachBEModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Business Entity</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-muted-foreground mb-3">
              Select a business entity to attach this product to. Only one entity per marketplace is allowed.
            </p>
            <Select value={attachingBEId} onValueChange={setAttachingBEId}>
              <SelectTrigger>
                <SelectValue placeholder="Select business entity..." />
              </SelectTrigger>
              <SelectContent>
                {availableBEs.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No business entities available</div>
                ) : (
                  availableBEs.map(be => {
                    const isConflict = attachedMarketplaceIds.has(be.marketplace_id)
                    return (
                      <SelectItem key={be.id} value={be.id} disabled={isConflict}>
                        {be.name}
                        <span className="ml-1 text-muted-foreground text-xs">({be.marketplace_name})</span>
                        {isConflict && <span className="ml-1 text-xs text-muted-foreground"> — already attached</span>}
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowAttachBEModal(false); setAttachingBEId('') }}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!attachingBEId || attachBEMutation.isPending}
              onClick={() => {
                attachBEMutation.mutate(attachingBEId, {
                  onSuccess: () => {
                    toast.success('Business entity attached')
                    setShowAttachBEModal(false)
                    setAttachingBEId('')
                  },
                  onError: (err: unknown) => {
                    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                    toast.error(msg ?? 'Failed to attach')
                  },
                })
              }}
            >
              {attachBEMutation.isPending ? 'Attaching...' : 'Attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
