import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePurchaseOrder, useAdvancePOStatus } from '../../hooks/usePurchasing'
import { useAuth } from '../../contexts/AuthContext'
import { PurchaseOrderEditModal } from '../../components/modals/PurchaseOrderEditModal'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { cn, formatIDR, formatDate } from '../../lib/utils'
import { toast } from '../../lib/toast'
import type { POStatus } from '../../types/purchasing'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<POStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary', ORDERED: 'info', SHIPPED: 'warning',
  DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'destructive',
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: po, isLoading } = usePurchaseOrder(id!)
  const { user } = useAuth()
  const [showEdit, setShowEdit] = useState(false)
  const advanceStatusMutation = useAdvancePOStatus()

  const handleAdvanceStatus = async () => {
    if (!po?.next_status) return
    try {
      await advanceStatusMutation.mutateAsync({ id: po.id, status: po.next_status })
      toast.success(`Status updated to ${po.next_status}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!po) return <div className="p-8 text-center text-muted-foreground">Purchase order not found</div>

  const deliveryFeeIdr = Math.round(
    Number(po.delivery_fee ?? 0) * Number(po.exchange_rate ?? 0)
  )

  const attachments = [
    { label: 'PO Invoice', url: po.purchase_order_invoice_file },
    { label: 'Delivery Order', url: po.delivery_order_file },
    { label: 'DO Invoice', url: po.delivery_order_invoice_file },
    { label: 'Packing List', url: po.packing_list_file },
  ]

  const getFilename = (url: string) =>
    decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'file')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{po.purchase_order_number}</h1>
              <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Invoice {po.invoice_date ? formatDate(po.invoice_date) : '—'} · {po.supplier_name ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {user?.is_staff && !['COMPLETED', 'CANCELLED'].includes(po.status) && (
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          {user?.is_staff && po.next_status && (
            <Button
              size="sm"
              onClick={handleAdvanceStatus}
              disabled={advanceStatusMutation.isPending}
            >
              {advanceStatusMutation.isPending ? 'Updating...' : `→ ${po.next_status}`}
            </Button>
          )}
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* LEFT COLUMN — 2 cols wide */}
        <div className="col-span-2 space-y-6">
          {/* Card 1 — PO Information */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Purchase Order Information</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
              <InfoItem label="Supplier" value={po.supplier_name} />
              <InfoItem label="Forwarder" value={po.forwarder_name} />
              <InfoItem label="Jasa Belanja" value={po.shop_services} />
              <InfoItem label="Invoice No." value={po.invoice_number} />
              <InfoItem label="Invoice Date" value={po.invoice_date ? formatDate(po.invoice_date) : null} />
              <InfoItem label="Delivery Order No." value={po.delivery_order_number} />
              <InfoItem label="Delivery Date" value={po.delivery_date ? formatDate(po.delivery_date) : null} />
              <InfoItem label="Forecast Delivery" value={po.forecast_delivery_date ? formatDate(po.forecast_delivery_date) : null} />
            </div>
            <div className="border-t pt-4 grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoItem label="Currency" value={po.currency} />
              <InfoItem label="Exchange Rate" value={po.exchange_rate} />
              <InfoItem label="Commission %" value={po.commission_fee_pct != null ? `${po.commission_fee_pct}%` : null} />
              <InfoItem label="Delivery Fee (RMB)" value={po.delivery_fee} />
              <InfoItem label="Commission (IDR)" value={po.commission_fee != null ? formatIDR(po.commission_fee) : null} />
              <InfoItem label="Commission (RMB)" value={po.commission_fee_rmb} />
              <InfoItem label="CBM" value={po.cbm != null ? `${po.cbm} (actual)` : po.forecast_cbm != null ? `${po.forecast_cbm} (forecast)` : null} />
              <InfoItem label="Weight (kg)" value={po.weight} />
              <InfoItem label="Forecast CBM" value={po.forecast_cbm} />
              <InfoItem label="Forecast Shipping" value={po.forecast_shipping_fee != null ? formatIDR(po.forecast_shipping_fee) : null} />
            </div>
          </div>

          {/* Card 2 — Order Items + summary box */}
          <div className="rounded-lg border bg-card">
            <div className="px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Order Items</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit Price (RMB)</TableHead>
                  <TableHead className="text-right">Disc. Price (RMB)</TableHead>
                  <TableHead className="text-right">Total (IDR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(po.order_details ?? []).map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-medium">{item.product_variant_name}</TableCell>
                    <TableCell className="text-right">{item.ordered_qty}</TableCell>
                    <TableCell className="text-right">{item.received_qty ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs">{item.unit_price_foreign ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs">{item.discounted_unit_price_foreign ?? '—'}</TableCell>
                    <TableCell className="text-right text-xs">
                      {item.discounted_total_price_base != null ? formatIDR(item.discounted_total_price_base) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Summary box — bottom right */}
            <div className="flex justify-end px-6 py-5 border-t">
              <div className="w-72 space-y-2 text-sm">
                <SummaryRow label="Goods" value={po.total_item_amount != null ? formatIDR(po.total_item_amount) : '—'} />
                <SummaryRow label="Commission" value={po.commission_fee != null ? formatIDR(po.commission_fee) : '—'} />
                <SummaryRow label="Supplier Delivery" value={deliveryFeeIdr > 0 ? formatIDR(deliveryFeeIdr) : '—'} />
                <SummaryRow label="Freight" value={po.shipping_fee != null ? formatIDR(po.shipping_fee) : '—'} />
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span>{formatIDR(po.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR — 1 col */}
        <div className="space-y-6">
          {/* Sidebar Card 1 — Attachments */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Attachments</h2>
            <div className="space-y-3">
              {attachments.map(({ label, url }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold text-white",
                      url ? "bg-red-600" : "bg-muted"
                    )}>
                      PDF
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", !url && "text-muted-foreground")}>{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {url ? getFilename(url) : 'Not uploaded'}
                      </p>
                    </div>
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Card 2 — Supplier & Logistics */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Supplier & Logistics</h2>
            <div className="rounded-lg bg-muted/40 p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="text-sm font-semibold">{po.supplier_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Forwarder</p>
                <p className="text-sm font-semibold">{po.forwarder_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jasa Belanja</p>
                <p className="text-sm font-semibold">{po.shop_services ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exchange Rate</p>
                <p className="text-sm font-semibold">{po.exchange_rate ? `Rp ${Number(po.exchange_rate).toLocaleString('id-ID')}` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Card 3 — Financial Summary */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Financial Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatBox label="Total Amount" value={formatIDR(po.total_amount)} highlight />
              <StatBox label="Goods" value={po.total_item_amount != null ? formatIDR(po.total_item_amount) : '—'} />
              <StatBox label="COGS Ratio" value={po.cost_ratio_cogs != null ? `${po.cost_ratio_cogs.toFixed(2)}%` : '—'} />
              <StatBox label="Ship / QTY" value={po.shipping_per_qty != null ? formatIDR(po.shipping_per_qty) : '—'} />
            </div>
          </div>

          {/* Sidebar Card 4 — Order Summary */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Ordered</span>
                <span className="font-semibold">{po.total_ordered_qty} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Received</span>
                <span className="font-semibold">{po.total_received_qty} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line Items</span>
                <span className="font-semibold">{po.order_details?.length ?? 0} SKUs</span>
              </div>
              {po.cbm && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CBM</span>
                  <span className="font-semibold">{po.cbm} m³</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Card 5 — Status History */}
          {po.status_history && po.status_history.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-base font-semibold mb-4">Status History</h2>
              <div className="space-y-4">
                {po.status_history.map((entry, i) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 shrink-0" />
                      {i < po.status_history.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusVariant[entry.to_status]}>{entry.to_status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.changed_by_name ?? 'System'} · {formatDate(entry.cdate)}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {po && <PurchaseOrderEditModal open={showEdit} onClose={() => setShowEdit(false)} po={po} />}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{value ?? '—'}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-sm font-bold", highlight && "text-primary")}>{value}</p>
    </div>
  )
}
