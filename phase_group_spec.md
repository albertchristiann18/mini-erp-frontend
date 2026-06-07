FRONTEND TASK: Add group summary row to PO detail item table

FILES TO READ FIRST:
- src/pages/purchasing/PurchaseOrderDetailPage.tsx (lines 294-580 — the orderItemsContent IIFE and group rendering)

CURRENT STATE:
- Each product group renders as: (1) a flex-layout header row with product name + supplier link + total qty + total cost, (2) when expanded: individual variant grid rows
- The group header shows totals in the flex row but they do not align with the variant column grid below

USER REQUEST:
Add a summary row at the TOP of each expanded group using the SAME colTemplate grid as the variant rows, showing column totals. The flex header becomes a minimal collapse-toggle only (chevron + product name + supplier link, no quantity/cost totals in it).

IMPLEMENTATION SPEC:

### 1. Simplify the group header flex row

In the group header div (the flex div with onClick toggleGroupCollapse), REMOVE the ml-auto totals span:
  the span containing "Qty: ... Total: ..."

The header is now just: chevron + photo/placeholder + product name + supplier link.
Keep all existing classes and click handler.

### 2. Add a group summary row

Right after the group header div, inside the same !collapsedGroups check as the variant rows, add a grid summary row using colTemplate. Place it BEFORE the existing-items map.

Compute summary values:

```typescript
const groupStockData = group.existingItems.map(item => getItemStockData(item))
const sumSOH = groupStockData.reduce((s, d) => s + d.soh, 0)
const sumIncoming = groupStockData.reduce((s, d) => s + d.incoming, 0)
const sumUpcoming = groupStockData.reduce((s, d) => s + d.upcoming, 0)
const sumAvg = groupStockData.reduce((s, d) => s + d.avg, 0)
const groupDoi = sumAvg > 0 ? Math.round((sumSOH + sumIncoming) / sumAvg) : null
const groupDoiAfter = sumAvg > 0 ? Math.round(sumUpcoming / sumAvg) : null
const sumOrdered = group.existingItems.reduce((s, i) => s + i.ordered_qty, 0) +
  group.newItemsList.reduce((s, n) => s + Number(n.ordered_qty || 0), 0)
const sumReceived = group.existingItems.reduce((s, i) => s + (i.received_qty ?? 0), 0)
const sumTotalForeign = group.existingItems.reduce((s, i) => {
  const unitF = hasDiscount
    ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0)
    : Number(i.unit_price_foreign ?? 0)
  return s + unitF * i.ordered_qty
}, 0)
const sumTotalIdr = group.existingItems.reduce((s, i) => {
  const base = hasDiscount
    ? (i.discounted_total_price_base ?? i.total_price_base ?? 0)
    : (i.total_price_base ?? i.discounted_total_price_base ?? 0)
  return s + base
}, 0)
```

Render the summary row. It must have the EXACT same number of cells as the colTemplate.
Count the cells in the existing variant row to confirm the count, then match it.
Non-discount colTemplate has 16 columns. Discount has 17.

```tsx
<div className={`grid ${colTemplate} gap-2 items-center px-3 py-2 text-xs font-semibold bg-muted/20 border-b min-w-max`}>
  <span className="font-bold text-foreground">{group.productName}</span>
  <span className="text-right">{sumOrdered}</span>
  <span className="text-right text-muted-foreground">{sumReceived || '—'}</span>
  <span className="text-right">{sumSOH}</span>
  <span className="text-right text-blue-600">{sumIncoming}</span>
  <span className="text-right">{sumUpcoming}</span>
  <span className="text-right text-muted-foreground">{sumAvg > 0 ? `${sumAvg.toFixed(1)}/d` : '—'}</span>
  <span className={`text-right ${groupDoi !== null && groupDoi < 14 ? 'text-red-600' : groupDoi !== null && groupDoi <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
    {groupDoi !== null ? `${groupDoi}d` : '—'}
  </span>
  <span className={`text-right ${groupDoiAfter !== null && groupDoiAfter < 14 ? 'text-red-600' : groupDoiAfter !== null && groupDoiAfter <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
    {groupDoiAfter !== null ? `${groupDoiAfter}d` : '—'}
  </span>
  <span />
  {hasDiscount && <span />}
  <span />
  <span className="text-right">{sumTotalForeign > 0 ? formatForeignAmount(sumTotalForeign) : '—'}</span>
  <span className="text-right">{sumTotalIdr > 0 ? formatIDR(sumTotalIdr) : '—'}</span>
  <span />
  <span />
</div>
```

NOTE: If editMode && canAddDeleteItems, the variant rows have an extra delete button cell (32px). The summary row must also have an extra empty span in that case to keep column alignment. Add: {editMode && canAddDeleteItems && <span />}

### 3. Do NOT change variant item rows or new-item rows

### Tests
Run npm run test and fix any failures. The groupQty and groupCost variables may now be unused — remove them if so.

CONVENTIONS:
- No any types
- min-w-max on the summary row
- No new comments

VALIDATION (all must pass):
- npm run test
- npm run type-check
- npm run lint
