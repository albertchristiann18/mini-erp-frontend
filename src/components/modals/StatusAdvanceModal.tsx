import { useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useCheckPOTransition, useAdvancePOStatus } from "../../hooks/usePurchasing"
import { Check, X } from "lucide-react"
import { cn, formatIDR, formatDate } from "../../lib/utils"
import { toast } from "../../lib/toast"
import type { PurchaseOrder, POStatus } from "../../types/purchasing"

const statusVariant: Record<POStatus, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary", ORDERED: "info", SHIPPED: "warning",
  DELIVERED: "success", COMPLETED: "success", CANCELLED: "destructive",
}

const REQUIRED_FIELDS: Record<string, { field: string; label: string; section: string }[]> = {
  ORDERED: [
    { field: "exchange_rate",               label: "Exchange Rate",       section: "Financial Setup" },
    { field: "purchase_order_invoice_file", label: "PO Invoice File",    section: "Attachments" },
    { field: "invoice_number",              label: "Invoice Number",      section: "Logistics & Dates" },
    { field: "invoice_date",                label: "Invoice Date",        section: "Logistics & Dates" },
    { field: "commission_fee_pct",          label: "Commission %",        section: "Financial Setup" },
    { field: "forwarder_name",              label: "Forwarder",           section: "General" },
    { field: "supplier_name",               label: "Supplier",            section: "General" },
    { field: "shop_services",               label: "Jasa Belanja",        section: "General" },
    { field: "delivery_fee",               label: "Delivery Fee (RMB)",  section: "Financial Setup" },
    { field: "order_details",               label: "Order Items",         section: "Order Items" },
  ],
  SHIPPED: [
    { field: "delivery_order_number", label: "Delivery Order No.",  section: "Logistics & Dates" },
    { field: "delivery_order_file",   label: "Delivery Order File", section: "Attachments" },
    { field: "shipping_fee_per_cbm",  label: "Shipping Fee / CBM",  section: "Financial Setup" },
    { field: "cbm",                   label: "CBM",                 section: "Logistics & Dates" },
    { field: "weight",                label: "Weight (kg)",         section: "Logistics & Dates" },
  ],
  DELIVERED: [
    { field: "delivery_order_invoice_file", label: "DO Invoice File", section: "Attachments" },
  ],
  COMPLETED: [],
}

interface Props {
  open: boolean
  onClose: () => void
  po: PurchaseOrder
  targetStatus: POStatus
}

export function StatusAdvanceModal({ open, onClose, po, targetStatus }: Props) {
  const checkMutation = useCheckPOTransition()
  const advanceMutation = useAdvancePOStatus()

  useEffect(() => {
    if (open) {
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

  const sections = useMemo(() => {
    const map = new Map<string, { field: string; label: string; section: string }[]>()
    for (const field of fieldsForTarget) {
      const existing = map.get(field.section) ?? []
      existing.push(field)
      map.set(field.section, existing)
    }
    return Array.from(map.entries())
  }, [fieldsForTarget])

  const handleConfirm = async () => {
    try {
      await advanceMutation.mutateAsync({ id: po.id, status: targetStatus })
      toast.success(`Status updated to ${targetStatus}`)
      onClose()
    } catch {
      toast.error("Failed to update status")
    }
  }

  const canTransition = checkMutation.data?.can_transition ?? false

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Advance to {targetStatus}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {checkMutation.isPending ? (
            <div className="text-center text-muted-foreground py-8">Checking requirements...</div>
          ) : (
            <>
              {/* Header preview card */}
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{po.purchase_order_number}</span>
                  <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant={statusVariant[targetStatus]}>{targetStatus}</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Supplier: {po.supplier_name ?? "—"}</p>
                  <p>Invoice Date: {po.invoice_date ? formatDate(po.invoice_date) : "—"}</p>
                  <p>Exchange Rate: {po.exchange_rate ? Number(po.exchange_rate).toLocaleString("id-ID") : "—"}</p>
                  <p>Total Amount: {formatIDR(po.total_amount)}</p>
                </div>
              </div>

              {/* Requirements checklist */}
              {sections.map(([section, fields]) => (
                <div key={section}>
                  <h4 className="text-sm font-semibold mb-2">{section}</h4>
                  <div className="space-y-1">
                    {fields.map(f => {
                      const isMissing = missingFieldSet.has(f.field)
                      const missingMsg = checkMutation.data?.missing_fields.find(m => m.field === f.field)
                      return (
                        <div key={f.field} className={cn(
                          "flex items-start gap-2 text-sm px-2 py-1 rounded",
                          isMissing && "bg-red-50 dark:bg-red-950/20"
                        )}>
                          {isMissing ? (
                            <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" data-testid="x-icon" />
                          ) : (
                            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" data-testid="check-icon" />
                          )}
                          <div>
                            <span className={cn(isMissing && "text-red-600 dark:text-red-400 font-medium")}>
                              {f.label}
                            </span>
                            {isMissing && missingMsg && (
                              <p className="text-xs text-red-500 mt-0.5">{missingMsg.message}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!checkMutation.isPending && (
            <>
              {!canTransition && fieldsForTarget.length > 0 && (
                <p className="text-xs text-muted-foreground self-center mr-2">
                  Fill missing fields via Edit before advancing
                </p>
              )}
              <Button
                onClick={handleConfirm}
                disabled={!canTransition || advanceMutation.isPending}
              >
                {advanceMutation.isPending ? "Advancing..." : "Confirm"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
