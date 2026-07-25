import type { Dispatch, SetStateAction } from 'react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Plus, X } from 'lucide-react'
import { toast } from '../../../lib/toast'
import type { ProductBusinessEntity, BusinessEntity } from '../../../types/inventory'
import type { UseMutateFunction } from '@tanstack/react-query'

export interface BusinessEntitiesSectionProps {
  assignments: ProductBusinessEntity[]
  availableBEs: BusinessEntity[]
  attachedMarketplaceIds: Set<string>
  isStaff: boolean
  showAttachModal: boolean
  attachingId: string
  setShowAttachModal: Dispatch<SetStateAction<boolean>>
  setAttachingId: Dispatch<SetStateAction<string>>
  attachMutation: { mutate: UseMutateFunction<{ id: string; product_id: string; business_entity_id: string; created: boolean }, Error, string, unknown>; isPending: boolean }
  detachMutation: { mutate: UseMutateFunction<unknown, Error, string, unknown>; isPending: boolean }
}

export function BusinessEntitiesSection({
  assignments,
  availableBEs,
  attachedMarketplaceIds,
  isStaff,
  showAttachModal,
  attachingId,
  setShowAttachModal,
  setAttachingId,
  attachMutation,
  detachMutation,
}: BusinessEntitiesSectionProps) {
  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-semibold">Business Entities</span>
          {isStaff && (
            <Button size="sm" variant="outline" onClick={() => setShowAttachModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Attach
            </Button>
          )}
        </div>
        <div className="p-4">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No business entities attached</p>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.business_entity_name}</span>
                    <Badge variant="outline" className="text-xs">{a.marketplace_name}</Badge>
                  </div>
                  {isStaff && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => detachMutation.mutate(a.id, {
                        onSuccess: () => toast.success('Detached'),
                        onError: () => toast.error('Failed to detach'),
                      })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach Business Entity</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={attachingId} onValueChange={setAttachingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a business entity" />
              </SelectTrigger>
              <SelectContent>
                {availableBEs.map(be => {
                  const disabled = attachedMarketplaceIds.has(be.marketplace_id)
                  return (
                    <SelectItem key={be.id} value={be.id} disabled={disabled}>
                      {be.name} ({be.marketplace_name})
                      {disabled ? ' (marketplace already attached)' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachModal(false)}>Cancel</Button>
            <Button
              disabled={!attachingId}
              onClick={() => {
                attachMutation.mutate(attachingId, {
                  onSuccess: () => { toast.success('Attached'); setShowAttachModal(false); setAttachingId('') },
                  onError: () => toast.error('Failed to attach'),
                })
              }}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
