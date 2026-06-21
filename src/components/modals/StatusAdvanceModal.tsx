import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { useCheckPOTransition, useUpdatePurchaseOrder } from "../../hooks/usePurchasing"
import { Check, X } from "lucide-react"
import { cn, formatIDR, formatDate } from "../../lib/utils"
import { toast } from "../../lib/toast"
import type { PurchaseOrder, POStatus } from "../../types/purchasing"

const statusVariant: Record<POStatus, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary", ORDERED: "info", SHIPPED: "warning",
  DELIVERED: "success", COMPLETED: "success", CANCELLED: "destructive",
}

type FieldConfig = {
  field: string
  label: string
  section: string
  inputType: "text" | "number" | "date" | "file"
  suffix?: string
  step?: string
}

const REQUIRED_FIELDS: Record<string, FieldConfig[]> = {
  ORDERED: [
    { field: "supplier_name",               label: "Supplier",            section: "General",          inputType: "text" },
    { field: "forwarder_name",              label: "Forwarder",           section: "General",          inputType: "text" },
    { field: "shop_services",               label: "Jasa Belanja",        section: "General",          inputType: "text" },
    { field: "exchange_rate",               label: "Exchange Rate",       section: "Financial Setup",  inputType: "number", step: "0.001" },
    { field: "commission_fee_pct",          label: "Commission %",        section: "Financial Setup",  inputType: "number" },
    { field: "delivery_fee",               label: "Delivery Fee (RMB)",  section: "Financial Setup",  inputType: "number", step: "0.001" },
    { field: "invoice_number",              label: "Invoice Number",      section: "Logistics & Dates", inputType: "text" },
    { field: "invoice_date",                label: "Invoice Date",        section: "Logistics & Dates", inputType: "date" },
    { field: "purchase_order_invoice_file", label: "PO Invoice File",    section: "Attachments",       inputType: "file" },
    { field: "order_details",               label: "Order Items",         section: "Order Items",       inputType: "text" },
  ],
  SHIPPED: [
    { field: "delivery_order_number", label: "Delivery Order No.",  section: "Logistics & Dates", inputType: "text" },
    { field: "cbm",                   label: "CBM",                 section: "Logistics & Dates", inputType: "number", step: "0.001", suffix: "m\u00b3" },
    { field: "weight",                label: "Weight",              section: "Logistics & Dates", inputType: "number", step: "0.01",  suffix: "kg" },
    { field: "shipping_fee_per_cbm",  label: "Shipping Fee / CBM",  section: "Financial Setup",   inputType: "number" },
    { field: "delivery_order_file",   label: "Delivery Order File", section: "Attachments",        inputType: "file" },
  ],
  DELIVERED: [
    { field: "delivery_order_invoice_file", label: "DO Invoice File", section: "Attachments", inputType: "file" },
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
  const updateMutation = useUpdatePurchaseOrder()
  const [formValues, setFormValues] = useState<Record<string, string | File>>({})

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

              <div className="space-y-1">
                {fieldsForTarget.map(cfg => {
                  const originallyMissing = missingFieldSet.has(cfg.field)
                  const showRed = originallyMissing && !formValues[cfg.field]
                  return (
                    <div key={cfg.field} className={cn(
                      "flex items-start gap-2 text-sm px-2 py-1.5 rounded",
                      showRed && "bg-red-50 dark:bg-red-950/20"
                    )}>
                      {showRed
                        ? <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" data-testid="x-icon" />
                        : <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" data-testid="check-icon" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", showRed && "text-red-600 dark:text-red-400")}>
                            {cfg.label}
                          </span>
                        </div>
                        {cfg.inputType !== "file" && cfg.field !== "order_details" && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Input
                              type={cfg.inputType}
                              step={cfg.step}
                              className="h-7 text-xs"
                              placeholder={cfg.label}
                              value={String(formValues[cfg.field] ?? "")}
                              onChange={e => setField(cfg.field, e.target.value)}
                            />
                            {cfg.suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{cfg.suffix}</span>}
                          </div>
                        )}
                        {cfg.inputType === "file" && originallyMissing && (
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="mt-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) setField(cfg.field, file)
                            }}
                          />
                        )}
                        {cfg.inputType === "file" && !originallyMissing && (() => {
                          const url = String((po as unknown as Record<string, unknown>)[cfg.field] ?? "")
                          return (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline"
                              >
                                View
                              </a>
                              <label className="text-xs text-muted-foreground cursor-pointer">
                                Replace
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  className="ml-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground"
                                  onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) setField(cfg.field, file)
                                  }}
                                />
                              </label>
                            </div>
                          )
                        })()}
                        {cfg.field === "order_details" && originallyMissing && (
                          <p className="text-xs text-muted-foreground mt-0.5">Add order items via Edit before advancing.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {checkMutation.data?.warnings && checkMutation.data.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠ Warning</p>
              {checkMutation.data.warnings.map((w, i) => (
                <div key={i}>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{w.message}</p>
                  {w.items && w.items.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {w.items.map(item => (
                        <li key={item.name} className="text-xs text-amber-600 dark:text-amber-500">
                          {item.name}: received {item.received_qty} of {item.ordered_qty}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">You can still confirm — this is a warning only.</p>
            </div>
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
