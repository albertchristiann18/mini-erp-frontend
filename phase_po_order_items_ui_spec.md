FRONTEND TASK: PurchaseOrderDetailPage — Order Items UX improvements

GOAL:
Four targeted UX fixes to the Order Items table: (1) remove the ugly inline sub-row that
shows Shipping/unit · Delivery/unit · Commission/unit · COGS/unit as text, (2) move COGS/u
into the correct column, (3) show Unit Price and Unit Rp in the group header row (taking the
max when items differ), (4) add an Expand All / Collapse All toggle to the section header.

FILES TO READ FIRST:
- mini-erp-frontend/src/pages/purchasing/PurchaseOrderDetailPage.tsx
  (full file — key sections: lines 156-162 [collapsedGroups], 522-530 [freightPerUnit],
   613-929 [orderItemsContent groups], 1471-1549 [Order Items section header])

CURRENT STATE:
- The ugly sub-row (lines 813-829) conditionally renders below each item when
  `item.cogs_per_unit_idr != null`, showing: "Shipping/unit: Rp X · Delivery/unit: Rp X · Commission/unit: Rp X · COGS/unit: Rp X" as a colSpan=20 text row.
- Line 796: COGS/u column shows `'—'` when `cogs_per_unit_idr != null` (because the value
  is shown in the sub-row instead).
- Lines 683, 685, 690 in the group header row: three `<td className="px-3 py-2" />` (empty)
  for Unit Price, Unit Rp, and COGS/u.
- No expand/collapse all control exists; individual groups toggle via chevron click.
- `useMemo` is already imported (line 1).
- `allGroupKeys` does not exist; group keys are computed only inside the `orderItemsContent` IIFE.

IMPLEMENTATION SPEC:

### 1. Remove sub-row (lines 813-829)
Delete the entire `{item.cogs_per_unit_idr != null && (<tr>...</tr>)}` block.
This is the <React.Fragment> sub-row that shows Shipping/unit etc. as a separate table row.
Delete lines 813–829 entirely.

### 2. Fix COGS/u column in existing item rows (line 796)
BEFORE:
  {item.cogs_per_unit_idr != null ? '—' : (cogsPerUnit > 0 ? formatIDR(cogsPerUnit) : '—')}
AFTER:
  {item.cogs_per_unit_idr != null ? formatIDR(item.cogs_per_unit_idr) : (cogsPerUnit > 0 ? formatIDR(cogsPerUnit) : '—')}

### 3. Show Unit Price, Unit Rp, COGS/u in group header row

Inside `return Array.from(groupMap.values()).map(group => {` (line 613), add these
three computed values after the existing `sumTotalIdr` calculation (after line 639):

  const maxUnitForeign = group.existingItems.length > 0
    ? Math.max(...group.existingItems.map(i =>
        hasDiscount
          ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0)
          : Number(i.unit_price_foreign ?? 0)))
    : 0
  const maxUnitIdr = Math.round(maxUnitForeign * poExchangeRate)
  const maxCogsPerUnit = group.existingItems.length > 0
    ? Math.max(...group.existingItems.map(i => {
        if (i.cogs_per_unit_idr != null) return i.cogs_per_unit_idr
        const unitF = hasDiscount
          ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0)
          : Number(i.unit_price_foreign ?? 0)
        return Math.round(unitF * poExchangeRate) + freightPerUnit + commissionPerUnit
      }))
    : 0

Then update the three empty `<td>` cells in the group header row:

  Line 683 (currently `<td className="px-3 py-2" />`  ← Unit Price column):
  REPLACE WITH:
    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">
      {maxUnitForeign > 0
        ? `${getCurrencySymbol(po?.currency ?? String(headerValues.currency))} ${formatForeignAmount(maxUnitForeign)}`
        : '—'}
    </td>

  Line 685 (currently `<td className="px-3 py-2" />` ← Unit Rp column):
  REPLACE WITH:
    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">
      {maxUnitIdr > 0 ? formatIDR(maxUnitIdr) : '—'}
    </td>

  Line 690 (currently `<td className="px-3 py-2" />` ← COGS/u column):
  REPLACE WITH:
    <td className="px-3 py-2 whitespace-nowrap font-medium text-amber-700">
      {maxCogsPerUnit > 0 ? formatIDR(maxCogsPerUnit) : '—'}
    </td>

  Line 684 (hasDiscount Disc. Price column) — leave as empty `<td>`.
  Line 691 (Remarks column) — leave as empty `<td>`.

### 4. Add allGroupKeys useMemo + Expand/Collapse All button

In the main component body (before the `return` JSX, after line 530 where `commissionPerUnit`
is defined), add:

  const allGroupKeys = useMemo(() => {
    const keys = new Set<string>()
    // Mirror the same filtering that orderItemsContent uses for visibleDetails
    for (const item of (po?.order_details ?? []).filter(i => !i.is_draft && !deletedDetailIds.has(i.id))) {
      if (groupBy === 'product') {
        keys.add(item.product_id || 'unknown')
      } else if (groupBy === 'flat') {
        keys.add(item.id)
      } else {
        const dimValue = item.variant_values?.[groupBy] ?? 'Other'
        keys.add(`${item.product_id}_${dimValue}`)
      }
    }
    // Also include groups from newItems (added in edit mode), matching orderItemsContent logic
    if (editMode && canAddDeleteItems) {
      for (const n of newItems) {
        keys.add(n.product_id || `new-${n._tempId}`)
      }
    }
    return [...keys]
  }, [po?.order_details, groupBy, deletedDetailIds, editMode, canAddDeleteItems, newItems])

  const allCollapsed = allGroupKeys.length > 0 &&
    allGroupKeys.every(k => collapsedGroups.has(k))

In the Order Items section header (around line 1475, inside the `<div className="flex items-center gap-3">` that already contains the 7d/14d/30d buttons), add the toggle button AFTER the Group By select and BEFORE the Has Discount checkbox:

  {!isCreating && allGroupKeys.length > 0 && (
    <button
      type="button"
      className="text-xs text-muted-foreground hover:text-foreground underline"
      onClick={() => {
        if (allCollapsed) setCollapsedGroups(new Set())
        else setCollapsedGroups(new Set(allGroupKeys))
      }}
    >
      {allCollapsed ? 'Expand all' : 'Collapse all'}
    </button>
  )}

EDGE CASES:
- When `group.existingItems` is empty (group has only new draft items), `maxUnitForeign`,
  `maxUnitIdr`, and `maxCogsPerUnit` all fall back to 0 → show '—'. Correct.
- When `Math.max()` receives NaN (e.g., all items have null price), result is NaN → `NaN > 0`
  is false → shows '—'. Correct.
- When `allGroupKeys` is empty (no items), the Expand/Collapse All button is not shown.
- When `po` is null/undefined (loading state), `allGroupKeys` = []. No button shown.

TESTS REQUIRED:
- Run existing PurchaseOrderDetailPage.test.tsx (1331 lines) — all tests must pass.
- No new tests required: these are display-only changes with no new state transitions.
  The existing test suite covers the component's data flow.

CONVENTIONS:
- Follow patterns in mini-erp-frontend/AGENTS.md
- Do not add `any` types
- Run `npm run typecheck` and `npm test -- --run` before finishing

VALIDATION (all must pass):
- npm run typecheck (no TS errors)
- npm test -- --run (all existing tests pass)
