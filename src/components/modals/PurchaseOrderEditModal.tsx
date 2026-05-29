import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog"
import { FormField } from "../ui/form"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { useUpdatePurchaseOrder } from "../../hooks/usePurchasing"
import { useProductVariants } from "../../hooks/useInventory"
import { toast } from "../../lib/toast"
import { Plus, Trash2, ExternalLink } from "lucide-react"
import type { PurchaseOrder } from "../../types/purchasing"

interface OrderDetailForm {
  id?: string
  product_variant_id: string
  ordered_qty: number
  unit_price_foreign?: number
  discounted_unit_price_foreign?: number
  received_qty?: number
  remarks?: string
}

interface FormValues {
  supplier_name: string
  forwarder_name: string
  shop_services: string
  currency: string
  exchange_rate?: number
  invoice_number: string
  invoice_date: string
  delivery_order_number: string
  delivery_date: string
  forecast_delivery_date: string
  cbm?: number
  forecast_cbm?: number
  weight?: number
  shipping_fee_per_cbm?: number
  forecast_shipping_fee?: number
  commission_fee_pct?: number
  delivery_fee?: number
  commission_fee_rmb?: number
  order_details: OrderDetailForm[]
}

interface Props {
  open: boolean
  onClose: () => void
  po: PurchaseOrder
}

const fileFields = [
  { key: "purchase_order_invoice_file", label: "PO Invoice" },
  { key: "delivery_order_file", label: "Delivery Order" },
  { key: "delivery_order_invoice_file", label: "DO Invoice" },
  { key: "packing_list_file", label: "Packing List" },
] as const

export function PurchaseOrderEditModal({ open, onClose, po }: Props) {
  const updateMutation = useUpdatePurchaseOrder()
  const { data: variantsData } = useProductVariants()
  const variants = variantsData?.results ?? []
  const [fileUploads, setFileUploads] = useState<Record<string, File>>({})

  const isHeaderEditable = ["DRAFT", "ORDERED", "SHIPPED"].includes(po.status)
  const canEditExchangeRate = po.status === "DRAFT"
  const canEditOrderItems = po.status === "DRAFT"
  const canEditReceivedQty = po.status === "DELIVERED"
  const canUploadFiles = !["COMPLETED", "CANCELLED"].includes(po.status)

  const { register, handleSubmit, reset, setValue, watch, control, formState: { dirtyFields, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      supplier_name: po.supplier_name ?? "",
      forwarder_name: po.forwarder_name ?? "",
      shop_services: po.shop_services ?? "",
      currency: po.currency ?? "",
      exchange_rate: po.exchange_rate ? Number(po.exchange_rate) : undefined,
      invoice_number: po.invoice_number ?? "",
      invoice_date: po.invoice_date ?? "",
      delivery_order_number: po.delivery_order_number ?? "",
      delivery_date: po.delivery_date ?? "",
      forecast_delivery_date: po.forecast_delivery_date ?? "",
      cbm: po.cbm ? Number(po.cbm) : undefined,
      forecast_cbm: po.forecast_cbm ? Number(po.forecast_cbm) : undefined,
      weight: po.weight ? Number(po.weight) : undefined,
      shipping_fee_per_cbm: po.shipping_fee_per_cbm != null ? Number(po.shipping_fee_per_cbm) : undefined,
      forecast_shipping_fee: po.forecast_shipping_fee != null ? Number(po.forecast_shipping_fee) : undefined,
      commission_fee_pct: po.commission_fee_pct ?? undefined,
      delivery_fee: po.delivery_fee ? Number(po.delivery_fee) : undefined,
      commission_fee_rmb: po.commission_fee_rmb ? Number(po.commission_fee_rmb) : undefined,
      order_details: po.order_details?.map(d => ({
        id: d.id,
        product_variant_id: d.product_variant,
        ordered_qty: d.ordered_qty,
        unit_price_foreign: d.unit_price_foreign ? Number(d.unit_price_foreign) : undefined,
        discounted_unit_price_foreign: d.discounted_unit_price_foreign ? Number(d.discounted_unit_price_foreign) : undefined,
        received_qty: d.received_qty ?? 0,
        remarks: d.remarks ?? "",
      })) ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "order_details" })

  const handleClose = () => {
    reset()
    setFileUploads({})
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = {}
    for (const key of Object.keys(dirtyFields)) {
      payload[key] = values[key as keyof FormValues]
    }
    if (values.order_details && (po.status === "DRAFT" || po.status === "DELIVERED")) {
      payload.order_details = values.order_details
    }
    for (const [key, file] of Object.entries(fileUploads)) {
      payload[key] = file
    }
    if (Object.keys(payload).length === 0) {
      handleClose()
      return
    }
    try {
      await updateMutation.mutateAsync({ id: po.id, data: payload })
      toast.success("Purchase order updated")
      handleClose()
    } catch {
      toast.error("Failed to update purchase order")
    }
  }

  const handleFileChange = (fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileUploads(prev => ({ ...prev, [fieldName]: file }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {po.purchase_order_number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">General</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Supplier Name">
                {isHeaderEditable ? (
                  <Input {...register("supplier_name")} placeholder="Supplier name" />
                ) : (
                  <p className="text-sm py-2">{po.supplier_name ?? "—"}</p>
                )}
              </FormField>
              <FormField label="Forwarder Name">
                {isHeaderEditable ? (
                  <Input {...register("forwarder_name")} placeholder="Forwarder name" />
                ) : (
                  <p className="text-sm py-2">{po.forwarder_name ?? "—"}</p>
                )}
              </FormField>
              <FormField label="Jasa Belanja">
                {isHeaderEditable ? (
                  <Input {...register("shop_services")} placeholder="Jasa belanja" />
                ) : (
                  <p className="text-sm py-2">{po.shop_services ?? "—"}</p>
                )}
              </FormField>
              <FormField label="Currency">
                {isHeaderEditable ? (
                  <Input {...register("currency")} placeholder="RMB / USD" />
                ) : (
                  <p className="text-sm py-2">{po.currency ?? "—"}</p>
                )}
              </FormField>
              <FormField label="Exchange Rate">
                {canEditExchangeRate ? (
                  <Input aria-label="Exchange Rate" type="number" step="any" {...register("exchange_rate", { valueAsNumber: true })} />
                ) : (
                  <Input aria-label="Exchange Rate" type="number" step="any" {...register("exchange_rate", { valueAsNumber: true })} disabled />
                )}
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">Dates & Logistics</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["invoice_number", "Invoice No."],
                ["invoice_date", "Invoice Date"],
                ["delivery_order_number", "DO No."],
                ["delivery_date", "Delivery Date"],
                ["forecast_delivery_date", "Forecast Delivery"],
                ["cbm", "CBM"],
                ["forecast_cbm", "Forecast CBM"],
                ["weight", "Weight"],
                ["shipping_fee_per_cbm", "Shipping Fee/CBM (IDR)"],
                ["forecast_shipping_fee", "Forecast Shipping Fee (IDR)"],
              ] as const).map(([field, label]) => {
                const isDate = field.includes("date")
                const isNumber = ["cbm", "forecast_cbm", "weight", "shipping_fee_per_cbm", "forecast_shipping_fee"].includes(field)
                return (
                  <FormField key={field} label={label}>
                    {isHeaderEditable ? (
                      <Input
                        type={isDate ? "date" : isNumber ? "number" : "text"}
                        step={isNumber ? "any" : undefined}
                        {...register(field as keyof FormValues, isNumber ? { valueAsNumber: true } : undefined)}
                      />
                    ) : (
                      <p className="text-sm py-2">{String(po[field as keyof PurchaseOrder] ?? "—")}</p>
                    )}
                  </FormField>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1">Financials</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["commission_fee_pct", "Commission %"],
                ["delivery_fee", "Delivery Fee (RMB)"],
                ["commission_fee_rmb", "Commission (RMB)"],
              ] as const).map(([field, label]) => (
                <FormField key={field} label={label}>
                  {isHeaderEditable ? (
                    <Input type="number" step="any" {...register(field as keyof FormValues, { valueAsNumber: true })} />
                  ) : (
                    <p className="text-sm py-2">{String(po[field as keyof PurchaseOrder] ?? "—")}</p>
                  )}
                </FormField>
              ))}
            </div>
          </div>

          {canEditOrderItems && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="text-sm font-semibold text-foreground">Order Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ product_variant_id: "", ordered_qty: 1, unit_price_foreign: undefined, discounted_unit_price_foreign: undefined })}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-end">
                  <FormField label={i === 0 ? "Variant" : ""}>
                    <Select
                      value={watch(`order_details.${i}.product_variant_id`)}
                      onValueChange={(v) => setValue(`order_details.${i}.product_variant_id`, v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                      <SelectContent>
                        {variants.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name} ({v.sku})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={i === 0 ? "Qty" : ""}>
                    <Input
                      type="number"
                      {...register(`order_details.${i}.ordered_qty`, { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label={i === 0 ? "Unit Price" : ""}>
                    <Input
                      type="number"
                      step="any"
                      {...register(`order_details.${i}.unit_price_foreign`, { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label={i === 0 ? "Disc. Price" : ""}>
                    <Input
                      type="number"
                      step="any"
                      {...register(`order_details.${i}.discounted_unit_price_foreign`, { valueAsNumber: true })}
                    />
                  </FormField>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-red-500 hover:text-red-600 self-end">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {canEditReceivedQty && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-1">Received Quantities</h3>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_100px_1fr] gap-2 items-end">
                  <FormField label={i === 0 ? "Variant" : ""}>
                    <p className="text-sm py-2">{po.order_details?.[i]?.product_variant_name ?? "—"}</p>
                  </FormField>
                  <FormField label={i === 0 ? "Received Qty" : ""}>
                    <Input
                      type="number"
                      {...register(`order_details.${i}.received_qty`, { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label={i === 0 ? "Remarks" : ""}>
                    <Textarea {...register(`order_details.${i}.remarks`)} />
                  </FormField>
                </div>
              ))}
            </div>
          )}

          {canUploadFiles && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-1">Attachments</h3>
              <div className="space-y-3">
                {fileFields.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium text-foreground">{label}</label>
                    {(po as unknown as Record<string, string | null>)[key] && !fileUploads[key] && (
                      <div className="flex items-center gap-2 mb-1">
                        <ExternalLink className="h-3 w-3 text-primary" />
                        <a
                          href={(po as unknown as Record<string, string | null>)[key]!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View file
                        </a>
                      </div>
                    )}
                    {fileUploads[key] && (
                      <p className="text-sm text-muted-foreground mb-1">{fileUploads[key].name}</p>
                    )}
                    <Input type="file" onChange={handleFileChange(key)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
