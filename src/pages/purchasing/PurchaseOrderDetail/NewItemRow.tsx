/**
 * NewItemRow — an in-table editable row for a newly-added (unsaved) order item.
 * Presentational: receives draft item data + callbacks.
 */
import { Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { VariantSearchSelect } from '../VariantSearchSelect'
import { formatIDR } from '../../../lib/utils'
import type { ReplenishmentItem } from '../../../types/purchasing'
import { getCurrencySymbol, formatForeignAmount, doiAfterColor } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'
import type { NewItem } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'

interface NewItemRowProps {
  n: NewItem
  avgWindow: 7 | 14 | 30
  stockMap: Map<string, ReplenishmentItem>
  poExchangeRate: number
  freightPerUnit: number
  commissionPerUnit: number
  hasDiscount: boolean
  currency: string | null
  activeSupplierId: string | undefined
  onUpdateNewItem: (_tempId: string, field: string, value: string) => void
  onRemoveNewItem: (_tempId: string) => void
}

export function NewItemRow({
  n, avgWindow, stockMap, poExchangeRate, freightPerUnit, commissionPerUnit,
  hasDiscount, currency, activeSupplierId, onUpdateNewItem, onRemoveNewItem,
}: NewItemRowProps) {
  const liveStats = n.product_variant_id ? stockMap.get(n.product_variant_id) : undefined
  const ordQty = Number(n.ordered_qty) || 0
  const liveSoh = liveStats?.stock_on_hand ?? 0
  const liveIncoming = liveStats?.incoming_qty ?? 0
  const liveUpcoming = liveStats ? liveSoh + liveIncoming + ordQty : null
  const rawAvgLive = liveStats ? (avgWindow === 7 ? liveStats.avg_sales_7d : avgWindow === 14 ? liveStats.avg_sales_14d : liveStats.avg_sales_30d) : 0
  const avgN = rawAvgLive > 0 ? rawAvgLive : (liveStats ? 1 / avgWindow : 0)
  const doiN = liveStats && avgN > 0 ? Math.round((liveSoh + liveIncoming) / avgN) : null
  const doiAfterN = liveStats && avgN > 0 && ordQty > 0 ? Math.round((liveSoh + liveIncoming + ordQty) / avgN) : null
  const liveRec = liveStats && avgN > 0 ? Math.max(0, Math.ceil(avgN * 90 - liveSoh - liveIncoming)) : null
  const unitForeign = Number(n.unit_price_foreign) || 0
  const unitIdr = Math.round(unitForeign * poExchangeRate)
  const cogsPerUnit = unitIdr + freightPerUnit + commissionPerUnit
  const currSymbol = getCurrencySymbol(currency)

  return (
    <tr className="border-b last:border-b-0">
      <td colSpan={2} className="px-2 py-1 min-w-[160px]">
        <VariantSearchSelect value={n.product_variant_id} selectedLabel={n.product_variant_label} supplierId={activeSupplierId}
          onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, _lastCurrency, lastDiscountedUnitPriceForeign) => {
            onUpdateNewItem(n._tempId, 'product_variant_id', id); onUpdateNewItem(n._tempId, 'product_variant_label', label)
            onUpdateNewItem(n._tempId, 'product_id', productId); onUpdateNewItem(n._tempId, 'product_name', productName)
            onUpdateNewItem(n._tempId, 'product_supplier_link', productSupplierLink ?? ''); onUpdateNewItem(n._tempId, 'product_photo_url', productPhotoUrl ?? '')
            if (lastUnitPriceForeign && parseFloat(lastUnitPriceForeign) > 0) onUpdateNewItem(n._tempId, 'unit_price_foreign', lastUnitPriceForeign)
            if (hasDiscount && lastDiscountedUnitPriceForeign && parseFloat(lastDiscountedUnitPriceForeign) > 0) onUpdateNewItem(n._tempId, 'discounted_unit_price_foreign', lastDiscountedUnitPriceForeign)
          }} placeholder="Select variant" />
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap font-medium text-violet-600">{liveRec !== null ? liveRec : (liveStats ? '∞' : '—')}</td>
      <td className="px-2 py-1"><Input type="number" className="h-7 w-14 text-xs" value={n.ordered_qty} onChange={e => onUpdateNewItem(n._tempId, 'ordered_qty', e.target.value)} /></td>
      <td className="px-2 py-1" />
      <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{liveStats ? liveSoh : '—'}</td>
      <td className="px-3 py-1.5 whitespace-nowrap text-blue-600">{liveStats ? liveIncoming : '—'}</td>
      <td className="px-3 py-1.5 whitespace-nowrap font-medium">{liveUpcoming !== null ? liveUpcoming : '—'}</td>
      <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{liveStats && avgN > 0 ? `${avgN.toFixed(1)}/d` : '—'}</td>
      <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doiN !== null && doiN < 14 ? 'text-red-600' : 'text-muted-foreground'}`}>{doiN !== null ? `${doiN}d` : (liveStats ? '∞' : '—')}</td>
      <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doiAfterColor(doiAfterN)}`}>{doiAfterN !== null ? `${doiAfterN}d` : (liveStats && ordQty > 0 ? '∞' : '—')}</td>
      <td className="px-2 py-1"><Input type="number" step="0.001" className="h-7 w-20 text-xs" value={n.unit_price_foreign}
        onChange={e => { onUpdateNewItem(n._tempId, 'unit_price_foreign', e.target.value); if (hasDiscount) onUpdateNewItem(n._tempId, 'discounted_unit_price_foreign', e.target.value) }} /></td>
      {hasDiscount && <td className="px-2 py-1"><Input type="number" step="0.001" className="h-7 w-20 text-xs" value={n.discounted_unit_price_foreign} onChange={e => onUpdateNewItem(n._tempId, 'discounted_unit_price_foreign', e.target.value)} /></td>}
      <td className="px-3 py-1.5 whitespace-nowrap">{unitIdr > 0 ? formatIDR(unitIdr) : '—'}</td>
      <td className="px-3 py-1.5 whitespace-nowrap">{unitForeign * ordQty > 0 ? `${currSymbol} ${formatForeignAmount(unitForeign * ordQty)}` : '—'}</td>
      <td className="px-3 py-1.5 whitespace-nowrap font-medium">{unitIdr * ordQty > 0 ? formatIDR(unitIdr * ordQty) : '—'}</td>
      <td className="px-3 py-1.5 whitespace-nowrap font-medium text-amber-700">{cogsPerUnit > 0 ? formatIDR(cogsPerUnit) : '—'}</td>
      <td className="px-3 py-1.5" />
      <td className="px-2 py-1 w-8"><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onRemoveNewItem(n._tempId)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
    </tr>
  )
}
