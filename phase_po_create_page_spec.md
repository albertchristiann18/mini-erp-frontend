FRONTEND TASK: Replace "New PO" modal with a full-page creation form that mirrors the PO detail page layout

FILES TO READ FIRST:
- src/pages/purchasing/PurchaseOrderDetailPage.tsx  (full file — mirror its exact layout and patterns)
- src/pages/purchasing/PurchaseOrdersPage.tsx       (change "New PO" button behavior)
- src/App.tsx                                        (add new route)
- src/hooks/usePurchasing.ts                         (for useCreatePurchaseOrder, useReplenishment)
- src/hooks/useInventory.ts                          (for useWarehouses)
- src/features/purchasing/VariantSearchSelect.tsx    (to understand its props)

CURRENT STATE:
- "New PO" button in PurchaseOrdersPage opens PurchaseOrderFormModal (a popup dialog)
- The modal has a 3-field header (warehouse, currency, exchange rate) and an order items list
- After creation it navigates to the PO detail page
- The user wants this replaced with a full page that looks exactly like PurchaseOrderDetailPage

---

## TASK 1 — Create src/pages/purchasing/PurchaseOrderCreatePage.tsx

Create a new page at this path. It must:

### Page layout (mirror PurchaseOrderDetailPage exactly)
The page should look identical to the detail page but with all fields in "always-edit" mode.

**Page header (same flex layout as detail page):**
- Left: back arrow button → navigate('/purchasing/orders'), title "New Purchase Order"
- Right: "Cancel" button (outline, navigate back) + "Create PO" button (primary, submits)
- Disable both buttons while creating (isPending)

**Section 1 — 4-column grid same as detail page:**
- Left 3 cols: "PO Information" card (inputs, always editable)
- Right 1 col: "Estimated Summary" sidebar card

**PO Information card** — render all fields as Input/Select directly (no read mode needed):

Row 1 (grid-cols-2):
- Warehouse (Select, required) — use useWarehouses(), value is warehouse_id
- Supplier (text input) — supplier_name

Row 2 (grid-cols-2):
- Forwarder (text input) — forwarder_name
- Jasa Belanja (text input) — shop_services

Row 3 (grid-cols-2):
- Currency (Select, same options as detail page: CNY/USD/EUR/SGD/MYR/IDR, default 'CNY') — currency
- Exchange Rate (number input, step 0.001) — exchange_rate

Row 4 (grid-cols-2):
- Commission % (number input) — commission_fee_pct
- Delivery Fee (RMB) (number input, step 0.001) — delivery_fee

Row 5 (grid-cols-2):
- Forecast Delivery Date (date input) — forecast_delivery_date
- (empty)

Row 6 (grid-cols-2, below a border-t):
- Forecast CBM (number input, step 0.001) — forecast_cbm
- Forecast Shipping/CBM (number input, IDR) — forecast_shipping_fee_per_cbm

Each field uses: label above (text-xs text-muted-foreground mb-1) + input (h-7 text-xs).
Warehouse and Currency use the same Select/SelectTrigger/SelectContent/SelectItem as detail page.

**Estimated Summary sidebar card** (read-only, live-computed):
Show:
- Goods (IDR): sum of (unit_foreign × qty × exchange_rate) for all new items
- Commission: commission_fee_pct% × goods_in_foreign × exchange_rate
- Forecast Freight: forecast_cbm × forecast_shipping_fee_per_cbm
- Total: sum of all three

All values use formatIDR(), show '—' when 0.
Below a border-t, show: "0 units · 0 SKUs" (counts of items added)

**Notes card** (same as detail page, full width below the 4-col section):
- Textarea, min-h-[80px], placeholder "Add notes..."

**Order Items section** (full width, same table as detail page):
The table is always in "add mode" — only new items, no existing items.

Table headers (same as detail page):
Variant | Order | SOH | Incoming | Upcoming | AVG | DOI | DOI+ | Unit Price | [Disc. Price if hasDiscount] | Unit Rp | Total | Total Rp | COGS/u | [delete]

Note: No "Receive" column (that's only for SHIPPED/DELIVERED status).

For each new item row:
- Variant: VariantSearchSelect (same as detail page new item rows)
- Order: number Input h-7 w-14
- SOH: from stockMap (live, no snapshot)
- Incoming: from stockMap
- Upcoming: SOH + Incoming + orderedQty
- AVG: avg_sales from stockMap based on avgWindow
- DOI: (SOH+Incoming)/AVG
- DOI+: (SOH+Incoming+orderedQty)/AVG
- Unit Price: number input, step 0.001, h-7 w-20
  - When changed, if hasDiscount is false, also set discounted_unit_price_foreign = same value
- [Disc. Price]: only shown if hasDiscount, number input h-7 w-20
- Unit Rp: round(unit_price_foreign × exchange_rate) formatted as IDR
- Total: unit_price_foreign × qty formatted as foreign currency
- Total Rp: Unit Rp × qty formatted as IDR
- COGS/u: unitRp + 0 (no freight/commission per unit yet since PO not created) — show '—' if 0
- Delete button: Trash2 icon, red, removes the row

Row header in the items table: show "Add Item" + "Has Discount" controls in the section header (same as detail page edit mode).

avgWindow toggle (7d/30d) in section header (same as detail page).

### State shape:
```typescript
const [headerValues, setHeaderValues] = useState<Record<string, string>>({
  currency: 'CNY',
  warehouse_id: '',
})
const [newItems, setNewItems] = useState<Array<{
  _tempId: string
  product_variant_id: string
  product_variant_label: string
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  ordered_qty: string
  unit_price_foreign: string
  discounted_unit_price_foreign: string
}>>([])
const [hasDiscount, setHasDiscount] = useState(false)
const [avgWindow, setAvgWindow] = useState<7 | 30>(30)
```

Helper:
```typescript
const setHeaderField = (field: string, value: string) =>
  setHeaderValues(prev => ({ ...prev, [field]: value }))
```

### Submit handler (handleCreate):
```typescript
const handleCreate = async () => {
  const warehouseId = headerValues.warehouse_id
  if (!warehouseId) { toast.error('Warehouse is required'); return }
  const validItems = newItems.filter(n => n.product_variant_id && n.ordered_qty && n.unit_price_foreign)
  if (validItems.length === 0) { toast.error('At least one item is required'); return }

  const payload: Record<string, unknown> = {
    warehouse_id: warehouseId,
  }
  // Include non-empty header fields
  const optionalFields = ['currency', 'exchange_rate', 'supplier_name', 'forwarder_name',
    'shop_services', 'commission_fee_pct', 'delivery_fee', 'forecast_delivery_date',
    'forecast_cbm', 'forecast_shipping_fee_per_cbm', 'note']
  for (const field of optionalFields) {
    const val = headerValues[field]
    if (val != null && val !== '') {
      // Convert numeric fields to numbers
      const numericFields = ['exchange_rate', 'commission_fee_pct', 'delivery_fee',
        'forecast_cbm', 'forecast_shipping_fee_per_cbm']
      payload[field] = numericFields.includes(field) ? Number(val) : val
    }
  }
  payload.order_details = validItems.map(n => ({
    product_variant_id: n.product_variant_id,
    ordered_qty: Number(n.ordered_qty),
    unit_price_foreign: Number(n.unit_price_foreign),
    ...(hasDiscount && n.discounted_unit_price_foreign
      ? { discounted_unit_price_foreign: Number(n.discounted_unit_price_foreign) }
      : {}),
  }))

  try {
    await createMutation.mutateAsync(payload)
    // onCreated callback navigates: useCreatePurchaseOrder(id => navigate(`/purchasing/orders/${id}`))
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create purchase order'
    toast.error(msg)
  }
}
```

### Imports needed:
```typescript
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePurchaseOrder, useReplenishment } from '../../hooks/usePurchasing'
import { useWarehouses } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { VariantSearchSelect } from '../../features/purchasing/VariantSearchSelect'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { formatIDR } from '../../lib/utils'
import { toast } from '../../lib/toast'
import type { ReplenishmentItem } from '../../types/purchasing'
```

DOI color helper (copy from detail page):
```typescript
function doiAfterColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground'
  if (days < 30) return 'text-red-600'
  if (days < 80) return 'text-amber-600'
  if (days <= 120) return 'text-green-600'
  return 'text-red-600'
}
```

getCurrencySymbol helper (copy from detail page).

---

## TASK 2 — Update src/App.tsx

Add the new route BEFORE the `orders/:id` route so "new" isn't treated as an ID:

```tsx
import PurchaseOrderCreatePage from './pages/purchasing/PurchaseOrderCreatePage'

// Inside the purchasing routes:
<Route path="orders/new" element={<Suspense fallback={<Loading />}><PurchaseOrderCreatePage /></Suspense>} />
<Route path="orders/:id" element={<Suspense fallback={<Loading />}><PurchaseOrderDetailPage /></Suspense>} />
```

---

## TASK 3 — Update src/pages/purchasing/PurchaseOrdersPage.tsx

1. Remove: `import { PurchaseOrderFormModal }` line
2. Remove: `const [showModal, setShowModal] = useState(false)` state
3. Change "New PO" button:
   OLD: `<Button size="sm" onClick={() => setShowModal(true)}>`
   NEW: `<Button size="sm" onClick={() => navigate('/purchasing/orders/new')}>`
4. Remove: `<PurchaseOrderFormModal open={showModal} onClose={() => setShowModal(false)} />` at the bottom

---

## TESTS REQUIRED:
No new tests required — this is a page-level routing/layout change. The existing PurchaseOrderFormModal tests still pass since the modal file is untouched.

## CONVENTIONS:
- Double quotes for strings
- No comments except where logic is non-obvious
- Use `cn` from '../../lib/utils' for conditional classNames
- DON'T modify PurchaseOrderDetailPage.tsx or PurchaseOrderFormModal.tsx at all

## VALIDATION (all must pass):
- npm run type-check
- npm run lint

DO NOT COMMIT.
