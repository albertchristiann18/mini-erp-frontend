import { useParams, useNavigate } from 'react-router-dom'
import { usePurchaseOrder } from '../../hooks/usePurchasing'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { formatIDR, formatDate } from '../../lib/utils'
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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!po) return <div className="p-8 text-center text-muted-foreground">Purchase order not found</div>

  const files = [
    { label: 'PO Invoice', url: po.purchase_order_invoice_file },
    { label: 'Delivery Order', url: po.delivery_order_file },
    { label: 'DO Invoice', url: po.delivery_order_invoice_file },
    { label: 'Packing List', url: po.packing_list_file },
  ].filter(f => f.url)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold font-mono">{po.purchase_order_number}</h1>
        <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">PO Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Field label="Supplier" value={po.supplier_name} />
              <Field label="Forwarder" value={po.forwarder_name} />
              <Field label="Invoice No." value={po.invoice_number} />
              <Field label="Invoice Date" value={po.invoice_date ? formatDate(po.invoice_date) : null} />
              <Field label="DO No." value={po.delivery_order_number} />
              <Field label="Delivery Date" value={po.delivery_date ? formatDate(po.delivery_date) : null} />
              <Field label="Forecast Delivery" value={po.forecast_delivery_date ? formatDate(po.forecast_delivery_date) : null} />
              <Field label="CBM" value={po.cbm ?? po.forecast_cbm} suffix={po.cbm ? '(actual)' : po.forecast_cbm ? '(forecast)' : undefined} />
              <Field label="Exchange Rate" value={po.exchange_rate} />
              <Field label="Currency" value={po.currency} />
              <Field label="Commission %" value={po.commission_fee_pct != null ? `${po.commission_fee_pct}%` : null} />
              <Field label="Commission IDR" value={po.commission_fee != null ? formatIDR(po.commission_fee) : null} />
              <Field label="Commission RMB" value={po.commission_fee_rmb} />
              <Field label="Delivery Fee (RMB)" value={po.delivery_fee} />
              <Field label="Shipping Fee" value={po.shipping_fee != null ? formatIDR(po.shipping_fee) : null} />
              <Field label="Forecast Shipping" value={po.forecast_shipping_fee != null ? formatIDR(po.forecast_shipping_fee) : null} />
              <Field label="Item Amount" value={po.total_item_amount != null ? formatIDR(po.total_item_amount) : null} />
              <Field label="Total Amount" value={formatIDR(po.total_amount)} />
              <Field label="COGS Ratio" value={`${po.cost_ratio_cogs.toFixed(2)}%`} />
              <Field label="Shipping / QTY" value={po.shipping_per_qty != null ? formatIDR(po.shipping_per_qty) : null} />
            </div>
          </div>

          {po.order_details && po.order_details.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="px-6 py-4 border-b">
                <h2 className="text-base font-semibold">Line Items</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Unit Price (RMB)</TableHead>
                    <TableHead className="text-right">Discounted (RMB)</TableHead>
                    <TableHead className="text-right">Total (IDR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.order_details.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.product_variant_name}</TableCell>
                      <TableCell className="text-right">{item.ordered_qty}</TableCell>
                      <TableCell className="text-right">{item.received_qty ?? '—'}</TableCell>
                      <TableCell className="text-right">{item.unit_price_foreign ?? '—'}</TableCell>
                      <TableCell className="text-right">{item.discounted_unit_price_foreign ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {item.discounted_total_price_base != null ? formatIDR(item.discounted_total_price_base) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Attachments</h2>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files attached</p>
            ) : (
              <div className="space-y-2">
                {files.map(f => (
                  <a
                    key={f.label}
                    href={f.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {f.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, suffix }: { label: string; value: string | number | null | undefined; suffix?: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? '—'}{suffix ? ` ${suffix}` : ''}</p>
    </div>
  )
}
