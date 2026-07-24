/**
 * Shared helpers for PurchaseOrderDetail:
 * field labels, shared types, and stock-data computation.
 */
import type { PurchaseOrder, PurchaseOrderDetail, ReplenishmentItem } from '../../types/purchasing'

// ─── Shared data types ────────────────────────────────────────────────────────

export type ModalDraftItem = {
  product_variant_id: string
  product_variant_label: string
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  ordered_qty: string
  unit_price_foreign: string
  discounted_unit_price_foreign: string
}

export type NewItem = ModalDraftItem & { _tempId: string }

// ─── Hook props / result (declared here to keep usePurchaseOrderDetail.ts small) ──

export interface UsePurchaseOrderDetailProps {
  po: PurchaseOrder | undefined
  isCreating: boolean
  stockMap: Map<string, ReplenishmentItem>
  createMutateAsync: (payload: Record<string, unknown>) => Promise<{ id: string }>
  updateMutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>
}

export interface UsePurchaseOrderDetailResult {
  editMode: boolean
  headerValues: Record<string, string | File>
  detailValues: Record<string, Record<string, string>>
  deletedDetailIds: Set<string>
  newItems: NewItem[]
  hasDiscount: boolean
  validationErrors: string[]
  avgWindow: 7 | 14 | 30
  groupBy: string
  collapsedGroups: Set<string>
  allGroupKeys: string[]
  allCollapsed: boolean
  availableGroupKeys: string[]
  usedVariantIds: Set<string>
  activeSupplierId: string | undefined
  poExchangeRate: number
  freightPerUnit: number
  commissionPerUnit: number
  liveCommissionFee: number | null
  computedGoodsAmount: number
  deliveryFeeIdr: number
  enterEditMode: () => void
  cancelEditMode: () => void
  setHeaderField: (field: string, value: string | File) => void
  setDetailField: (itemId: string, field: string, value: string) => void
  handleCurrencyChange: (field: string, val: string | File) => void
  handleAddItemFromModal: (items: ModalDraftItem[]) => void
  removeNewItem: (_tempId: string) => void
  updateNewItem: (_tempId: string, field: string, value: string) => void
  deleteExistingItem: (itemId: string) => void
  handleCreate: () => Promise<void>
  handleSave: () => Promise<void>
  setHasDiscount: (v: boolean) => void
  setValidationErrors: (errors: string[]) => void
  setAvgWindow: (w: 7 | 14 | 30) => void
  setGroupBy: (key: string) => void
  toggleGroupCollapse: (key: string) => void
  setCollapsedGroups: (s: Set<string>) => void
  getItemStockData: (item: PurchaseOrderDetail) => ItemStockData
}

// ─── Field label map (used in save/validate error messages) ──────────────────

export const HEADER_FIELD_LABELS: Record<string, string> = {
  supplier_name: 'Supplier',
  forwarder_name: 'Forwarder',
  shop_services: 'Jasa Belanja',
  currency: 'Currency',
  exchange_rate: 'Exchange Rate',
  commission_fee_pct: 'Commission %',
  forecast_shipping_fee_per_cbm: 'Forecast Shipping/CBM',
  delivery_fee: 'Delivery Fee (RMB)',
  commission_fee_rmb: 'Commission (RMB)',
  invoice_number: 'Invoice No.',
  invoice_date: 'Invoice Date',
  delivery_order_number: 'Delivery Order No.',
  delivery_date: 'Delivery Date',
  forecast_delivery_date: 'Forecast Delivery',
  cbm: 'CBM',
  forecast_cbm: 'Forecast CBM',
  weight: 'Weight (kg)',
  shipping_fee_per_cbm: 'Shipping Fee/CBM',
  forecast_shipping_fee: 'Forecast Shipping',
  purchase_order_invoice_file: 'PO Invoice File',
  delivery_order_file: 'DO File',
  delivery_order_invoice_file: 'DO Invoice File',
  packing_list_file: 'Packing List',
}

// ─── Currency / formatting helpers ───────────────────────────────────────────
// Shared across PurchaseOrderDetail sub-components.
// Note: HEADER_FIELD_LABELS duplicates labels that also appear in
// pages/purchasing/PurchaseOrderDetail/headerFieldConfig.ts. We cannot derive
// one from the other without importing pages/ into hooks/, which would violate
// the shared↛pages boundary enforced by eslint-plugin-boundaries. Labels must
// therefore be kept in sync by hand when fields are added or renamed.

export function getCurrencySymbol(currency: string | null | undefined): string {
  const map: Record<string, string> = { CNY: '\xA5', RMB: '\xA5', USD: '$', EUR: '€', SGD: 'S$', MYR: 'RM', THB: '฿', IDR: 'Rp' }
  return map[(currency ?? '').toUpperCase()] ?? (currency ?? '')
}

export function formatForeignAmount(val: string | number | null | undefined): string {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Returns a Tailwind text-color class based on DOI-after-order days. */
export function doiAfterColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground'
  if (days < 30) return 'text-red-600'
  if (days < 80) return 'text-amber-600'
  if (days <= 120) return 'text-green-600'
  return 'text-red-600'
}

// ─── Item stock data ─────────────────────────────────────────────────────────

export type ItemStockData = {
  soh: number
  incoming: number
  upcoming: number
  avg: number
  doi: number | null
  doiAfter: number | null
  hasSnapshot: boolean
  recommendedQty: number | null
}

/**
 * Computes per-item stock and replenishment metrics.
 * Uses a snapshot embedded in the PO detail row when present;
 * falls back to live replenishment data from stockMap.
 *
 * When avg_sales is 0 (slow mover) but data exists, avg is floored to 1/avgWindow
 * so DOI/DOI+ remain finite (this is the intended business behavior — do not change).
 */
export function computeItemStockData(
  item: PurchaseOrderDetail,
  stockMap: Map<string, ReplenishmentItem>,
  avgWindow: 7 | 14 | 30,
): ItemStockData {
  const hasSnapshot = item.avg_sales !== null
  const liveStats = !hasSnapshot ? stockMap.get(item.variant_id) : undefined
  const soh = hasSnapshot ? item.stock_on_hand : (liveStats?.stock_on_hand ?? 0)
  const incoming = hasSnapshot ? item.incoming_qty : (liveStats?.incoming_qty ?? 0)
  const rawAvg = hasSnapshot
    ? (avgWindow === 7 ? Number(item.avg_sales_7d ?? 0) : Number(item.avg_sales ?? 0))
    : (avgWindow === 7
        ? (liveStats?.avg_sales_7d ?? 0)
        : avgWindow === 14
          ? (liveStats?.avg_sales_14d ?? 0)
          : (liveStats?.avg_sales_30d ?? 0))
  const hasData = hasSnapshot || liveStats !== undefined
  // Floor: 0-avg slow movers get 1/avgWindow so DOI/DOI+ stay finite
  const avg = rawAvg > 0 ? rawAvg : (hasData ? 1 / avgWindow : 0)
  const upcoming = soh + incoming + item.ordered_qty
  const doi = avg > 0 ? Math.round((soh + incoming) / avg) : null
  const doiAfter = avg > 0 ? Math.round(upcoming / avg) : null
  const recommendedQty = avg > 0 ? Math.max(0, Math.ceil(avg * 90 - soh - incoming)) : null
  return { soh, incoming, upcoming, avg, doi, doiAfter, hasSnapshot, recommendedQty }
}
