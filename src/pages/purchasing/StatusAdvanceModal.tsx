import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { useCheckPOTransition, useUpdatePurchaseOrder } from "../../hooks/api/usePurchasing"
import { useCompletedItemsEdit } from "../../hooks/purchasing/useCompletedItemsEdit"
import { formatIDR, formatDate } from "../../lib/utils"
import { toast } from "../../lib/toast"
import { REQUIRED_FIELDS } from "./StatusAdvanceModal/fieldConfig"
import { RequiredFieldsList } from "./StatusAdvanceModal/RequiredFieldsList"
import { CompletedItemsTable } from "./StatusAdvanceModal/CompletedItemsTable"
import { TransitionWarningsPanel } from "./StatusAdvanceModal/TransitionWarningsPanel"
import type { PurchaseOrder, POStatus } from "../../types/purchasing"

const statusVariant: Record<POStatus, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary", ORDERED: "info", SHIPPED: "warning",
  DELIVERED: "success", COMPLETED: "success", CANCELLED: "destructive",
}

interface Props {
  open: boolean
  onClose: () => void
  po: PurchaseOrder
  targetStatus: POStatus
}

export function StatusAdvanceModal({ open, onClose, po, targetStatus }: Props) {
  const checkMutation = useCheckPOTransition()
  const updateMutation = useUpdatePurchaseOrder()
  const [formValues, setFormValues] = useState<Record<string, string | File>>({})
  const completedItems = useCompletedItemsEdit(targetStatus === "COMPLETED" ? po.order_details : undefined)

  const setField = (field: string, value: string | File) =>
    setFormValues(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (open) {
      const initial: Record<string, string | File> = {}
      for (const cfg of REQUIRED_FIELDS[targetStatus] ?? []) {
        if (cfg.inputType === "file") continue
        if (cfg.field === "order_details") continue
        const val = (po as unknown as Record<string, unknown>)[cfg.field]
        if (val != null && val !== "") {
          initial[cfg.field] = String(val)
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormValues(initial)
      checkMutation.mutate({ id: po.id, status: targetStatus })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const missingFieldSet = useMemo(() => {
    if (!checkMutation.data) return new Set<string>()
    return new Set(checkMutation.data.missing_fields.map(f => f.field))
  }, [checkMutation.data])

  const fieldsForTarget = useMemo(
    () => REQUIRED_FIELDS[targetStatus] ?? [],
    [targetStatus],
  )

  const allMissingFilled = useMemo(() => {
    if (!checkMutation.data) return false
    const missingFields = checkMutation.data.missing_fields.map(f => f.field)
    const fillableMissing = missingFields.filter(f => f !== "order_details")
    return fillableMissing.every(f => {
      const v = formValues[f]
      return v !== undefined && v !== "" && v !== null
    })
  }, [checkMutation.data, formValues])

  const canConfirm = checkMutation.data?.can_transition || allMissingFilled

  const handleConfirm = async () => {
    const payload: Record<string, unknown> = { status: targetStatus }
    for (const [key, value] of Object.entries(formValues)) {
      if (value !== "" && value !== null && value !== undefined) {
        payload[key] = value
      }
    }
    if (targetStatus === "COMPLETED") {
      const changedOrderDetails = completedItems.getChangedOrderDetails()
      if (changedOrderDetails.length > 0) {
        payload.order_details = changedOrderDetails
      }
    }
    try {
      await updateMutation.mutateAsync({ id: po.id, data: payload })
      toast.success(`Status updated to ${targetStatus}`)
      onClose()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      const msg =
        (data?.error as string | undefined) ||
        Object.values(data ?? {})
          .flatMap(v => (Array.isArray(v) ? v : [v]))
          .filter(v => typeof v === "string")
          .join(" ") ||
        "Failed to update status"
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advance to {targetStatus}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {checkMutation.isPending ? (
            <div className="text-center text-muted-foreground py-8">Checking requirements...</div>
          ) : (
            <>
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{po.purchase_order_number}</span>
                  <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
                  <span className="text-muted-foreground">&rarr;</span>
                  <Badge variant={statusVariant[targetStatus]}>{targetStatus}</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Supplier: {po.supplier_name ?? "\u2014"}</p>
                  <p>Invoice Date: {po.invoice_date ? formatDate(po.invoice_date) : "\u2014"}</p>
                  <p>Exchange Rate: {po.exchange_rate ? Number(po.exchange_rate).toLocaleString("id-ID") : "\u2014"}</p>
                  <p>Total Amount: {formatIDR(po.total_amount)}</p>
                </div>
              </div>

              <RequiredFieldsList
                fields={fieldsForTarget}
                missingFieldSet={missingFieldSet}
                formValues={formValues}
                po={po}
                setField={setField}
              />

              {targetStatus === "COMPLETED" && (
                <CompletedItemsTable
                  visibleRows={completedItems.visibleRows}
                  totalCount={completedItems.rows.length}
                  flaggedCount={completedItems.flaggedRows.length}
                  overThreshold={completedItems.overThreshold}
                  showAll={completedItems.showAll}
                  onShowAll={() => completedItems.setShowAll(true)}
                  editedQty={completedItems.editedQty}
                  onSetQty={completedItems.setQty}
                />
              )}
            </>
          )}

          {targetStatus === "COMPLETED" ? (
            <TransitionWarningsPanel
              groups={
                completedItems.liveDiscrepancies.length > 0
                  ? [{
                      message: `${completedItems.liveDiscrepancies.length} item(s) have received qty less than ordered qty.`,
                      items: completedItems.liveDiscrepancies,
                    }]
                  : []
              }
            />
          ) : (
            <TransitionWarningsPanel groups={checkMutation.data?.warnings ?? []} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || updateMutation.isPending || checkMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : `Confirm \u2192 ${targetStatus}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
