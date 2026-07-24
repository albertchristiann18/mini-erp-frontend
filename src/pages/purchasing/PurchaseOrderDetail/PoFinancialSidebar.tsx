/**
 * PoFinancialSidebar — financial summary, order summary, and status history sidebar cards.
 * Presentational: receives derived values from the page.
 */
import { Badge } from '../../../components/ui/badge'
import { cn, formatIDR, formatDate } from '../../../lib/utils'
import { getCurrencySymbol, formatForeignAmount } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'
import type { PurchaseOrder, POStatus } from '../../../types/purchasing'
import type { BadgeProps } from '../../../components/ui/badge'

const statusVariant: Record<POStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary', ORDERED: 'info', SHIPPED: 'warning',
  DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'destructive',
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="font-medium text-foreground">{value}</span></div>
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground mb-1">{label}</p><p className={cn('text-sm font-bold', highlight && 'text-primary')}>{value}</p></div>
}

interface Props {
  po: PurchaseOrder
  isCreating: boolean
  hasDiscount: boolean
  liveCommissionFee: number | null
  computedGoodsAmount: number
  deliveryFeeIdr: number
  /** For creating mode: estimated goods in base currency */
  estGoods?: number
  estGoodsForeign?: number
  estCommission?: number
  estFreight?: number
  estDelivery?: number
  estTotal?: number
  totalUnits?: number
  totalSkus?: number
  newItemsCurrencySymbol?: string
  newItemsCurrency?: string
}

export function PoFinancialSidebar({
  po, isCreating, hasDiscount, liveCommissionFee, computedGoodsAmount, deliveryFeeIdr,
  estGoods = 0, estGoodsForeign = 0, estCommission = 0, estFreight = 0, estDelivery = 0,
  estTotal = 0, totalUnits = 0, totalSkus = 0, newItemsCurrencySymbol = '', newItemsCurrency = '',
}: Props) {
  const totalForeignAmount = isCreating ? 0 : (po.order_details ?? []).reduce(
    (s, i) => s + Number(hasDiscount ? (i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0) : (i.total_price_foreign ?? i.discounted_total_price_foreign ?? 0)), 0,
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">{isCreating ? 'Estimated Summary' : 'Financial Summary'}</h2>
        {isCreating ? (
          <div className="space-y-3 text-sm">
            <SummaryRow label="Goods" value={estGoods > 0 ? formatIDR(Math.round(estGoods)) : '—'} />
            {estGoodsForeign > 0 && <SummaryRow label={`Goods (${newItemsCurrency || 'Foreign'})`} value={`${newItemsCurrencySymbol} ${formatForeignAmount(estGoodsForeign)}`} />}
            <SummaryRow label="Commission" value={estCommission > 0 ? formatIDR(estCommission) : '—'} />
            <SummaryRow label="Forecast Freight" value={estFreight > 0 ? formatIDR(estFreight) : '—'} />
            <SummaryRow label="Supplier Delivery" value={estDelivery > 0 ? formatIDR(estDelivery) : '—'} />
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>Est. Total</span><span>{estTotal > 0 ? formatIDR(estTotal) : '—'}</span></div>
            <p className="text-xs text-muted-foreground pt-1">{totalUnits} units · {totalSkus} SKUs</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Goods" value={computedGoodsAmount > 0 ? formatIDR(computedGoodsAmount) : '—'} />
              {totalForeignAmount > 0 && <SummaryRow label={`Goods (${po.currency ?? 'Foreign'})`} value={`${getCurrencySymbol(po.currency)} ${formatForeignAmount(totalForeignAmount)}`} />}
              <SummaryRow label="Commission" value={(() => { const val = liveCommissionFee ?? po.commission_fee; return val != null ? formatIDR(val) : '—' })()} />
              <SummaryRow label="Supplier Delivery" value={deliveryFeeIdr > 0 ? formatIDR(deliveryFeeIdr) : '—'} />
              <SummaryRow label="Freight" value={(po.shipping_fee ?? 0) > 0 ? formatIDR(po.shipping_fee!) : '—'} />
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>Total Amount</span><span>{formatIDR(po.total_amount)}</span></div>
            </div>
            <div className="border-t pt-3 mt-3 space-y-3"><StatBox label="COGS Ratio" value={po.cost_ratio_cogs != null ? `${po.cost_ratio_cogs.toFixed(2)}%` : '—'} /></div>
          </>
        )}
      </div>
      {!isCreating && (
        <div className="rounded-lg border bg-card p-6"><h2 className="text-base font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Ordered</span><span className="font-semibold">{po.total_ordered_qty} units</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Received</span><span className="font-semibold">{po.total_received_qty} units</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Line Items</span><span className="font-semibold">{po.order_details?.length ?? 0} SKUs</span></div>
            {po.cbm && <div className="flex justify-between"><span className="text-muted-foreground">CBM</span><span className="font-semibold">{po.cbm} m³</span></div>}
          </div>
        </div>
      )}
      {!isCreating && po.status_history && po.status_history.length > 0 && (
        <div className="rounded-lg border bg-card p-4"><h2 className="text-sm font-semibold mb-3">Status History</h2>
          <div className="space-y-3">{po.status_history.map((entry, i) => (
            <div key={entry.id} className="flex gap-2">
              <div className="flex flex-col items-center"><div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />{i < po.status_history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}</div>
              <div className="pb-3">
                <div className="flex items-center gap-1.5 mb-0.5"><Badge variant={statusVariant[entry.to_status]}>{entry.to_status}</Badge></div>
                <p className="text-xs text-muted-foreground">{entry.changed_by_name ?? 'System'} · {formatDate(entry.cdate)}</p>
                {entry.note && <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>}
              </div>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  )
}
