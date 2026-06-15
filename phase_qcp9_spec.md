# QCP Phase 9 — Frontend: bulk add + auto-fill price + dynamic grouping

## GOAL
(A) Bulk add: allow selecting multiple variants at once from a modal on the PO
detail page instead of adding one at a time.

(B) Auto-fill price: when a variant is selected on any PO form, automatically
fill the unit price from the variant's last recorded foreign price if the
currency matches the current PO currency.

(C) Dynamic grouping on PO detail page: a UI toggle that groups the order items
table by product (default), by any variant dimension key (e.g. "color"), or flat
(no grouping). Not persisted. Only visible when `variant_values` exist on items.

---

## FILES TO READ FIRST
- `src/types/inventory.ts` (ProductVariantStock interface)
- `src/types/purchasing.ts` (PurchaseOrderDetail interface)
- `src/features/purchasing/VariantSearchSelect.tsx`
- `src/components/modals/PurchaseOrderFormModal.tsx`
- `src/pages/purchasing/PurchaseOrderDetailPage.tsx` (full file — it is long)
- `src/hooks/useInventory.ts` (useVariantSearch)

---

## CURRENT STATE
- `ProductVariantStock` in `inventory.ts` does NOT yet have `last_unit_price_foreign`
  or `last_currency` — QCP7 backend adds these fields, so they must be added to the
  TypeScript type in this phase
- `PurchaseOrderDetail` in `purchasing.ts` does NOT yet have `variant_values` field —
  QCP7 backend exposes it, add it here
- `VariantSearchSelect.onSelect` passes 6 args ending with `productPhotoUrl`; needs
  2 more args for price auto-fill
- `PurchaseOrderDetailPage` has an `AddItemModal` (one at a time) and a
  "Add Item" button; no bulk add exists yet
- Grouping in `PurchaseOrderDetailPage` is hard-coded to group by `product_id`

---

## IMPLEMENTATION SPEC

### Part A — Type updates

**File: `src/types/inventory.ts`**

In the `ProductVariantStock` interface, add two fields:
```typescript
last_unit_price_foreign: string | null
last_currency: string | null
```

**File: `src/types/purchasing.ts`**

In the `PurchaseOrderDetail` interface, add:
```typescript
variant_values: Record<string, string>
```

### Part B — Auto-fill price

**File: `src/features/purchasing/VariantSearchSelect.tsx`**

1. Extend the `Props.onSelect` callback signature to pass two more fields:
   ```typescript
   onSelect: (
     id: string,
     label: string,
     productId: string,
     productName: string,
     productSupplierLink: string | null,
     productPhotoUrl: string | null,
     lastUnitPriceForeign: string | null,
     lastCurrency: string | null,
   ) => void
   ```
   Also extend `onQuickCreated` array item type to include
   `lastUnitPriceForeign: string | null` and `lastCurrency: string | null`
   (both null — quick create has no price history yet).

2. In `handleSelect`, add the two new fields from `v`:
   ```typescript
   const handleSelect = (
     id: string, label: string, productId: string, productName: string,
     productSupplierLink: string | null, productPhotoUrl: string | null,
     lastUnitPriceForeign: string | null, lastCurrency: string | null,
   ) => {
     setInternalSelectedLabel(label)
     onSelect(id, label, productId, productName, productSupplierLink, productPhotoUrl,
       lastUnitPriceForeign, lastCurrency)
     setOpen(false)
     setSearchInput('')
     setActiveSearch('')
   }
   ```

3. At the variant list button `onClick` (currently line 119), pass the new fields:
   ```tsx
   onClick={() => handleSelect(
     v.id,
     `${v.name} (${v.sku_variant_code})`,
     v.product,
     v.product_name,
     v.product_supplier_link ?? null,
     v.product_photo_url ?? null,
     v.last_unit_price_foreign ?? null,
     v.last_currency ?? null,
   )}
   ```

4. In the `QuickCreateProductModal` `onCreated` callback, when calling `onSelect`,
   pass `null, null` for the two new price args.

**File: `src/components/modals/PurchaseOrderFormModal.tsx`**

At the `VariantSearchSelect` call site inside the `group.indices.map` block
(currently the `onSelect` prop at ~line 279), update to receive the new price args
and auto-fill when currencies match:

```tsx
onSelect={(id, _label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, lastCurrency) => {
  setValue(`order_details.${i}.product_variant_id`, id, { shouldValidate: true })
  setValue(`order_details.${i}.product_id`, productId)
  setValue(`order_details.${i}.product_name`, productName)
  setValue(`order_details.${i}.product_supplier_link`, productSupplierLink)
  setValue(`order_details.${i}.product_photo_url`, productPhotoUrl)
  const poCurrency = watch('currency')
  if (
    lastUnitPriceForeign &&
    lastCurrency &&
    lastCurrency === poCurrency
  ) {
    const price = parseFloat(lastUnitPriceForeign)
    if (!isNaN(price) && price > 0) {
      setValue(`order_details.${i}.unit_price_foreign`, price, { shouldValidate: true })
    }
  }
}}
```

**File: `src/pages/purchasing/PurchaseOrderDetailPage.tsx`**

Update the `VariantSearchSelect.onSelect` in `AddItemModal` (around line 1491)
to receive the new price args and auto-fill in draft:
```tsx
onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, lastCurrency) =>
  setDraft(prev => {
    const autoFill =
      lastUnitPriceForeign &&
      lastCurrency &&
      lastCurrency === currency &&
      parseFloat(lastUnitPriceForeign) > 0
    return {
      ...prev,
      product_variant_id: id,
      product_variant_label: label,
      product_id: productId,
      product_name: productName,
      product_supplier_link: productSupplierLink ?? null,
      product_photo_url: productPhotoUrl ?? null,
      ...(autoFill ? { unit_price_foreign: lastUnitPriceForeign! } : {}),
    }
  })
}
```

Also update the inline `VariantSearchSelect.onSelect` in the new-item rows
(the `updateNewItem` call site around line 670) to auto-fill price:
```tsx
onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, lastCurrency) => {
  updateNewItem(n._tempId, 'product_variant_id', id)
  updateNewItem(n._tempId, 'product_variant_label', label)
  updateNewItem(n._tempId, 'product_id', productId)
  updateNewItem(n._tempId, 'product_name', productName)
  updateNewItem(n._tempId, 'product_supplier_link', productSupplierLink ?? '')
  updateNewItem(n._tempId, 'product_photo_url', productPhotoUrl ?? '')
  const effectiveCurrency = po?.currency ?? String(headerValues.currency ?? '')
  if (
    lastUnitPriceForeign &&
    lastCurrency &&
    lastCurrency === effectiveCurrency &&
    parseFloat(lastUnitPriceForeign) > 0
  ) {
    updateNewItem(n._tempId, 'unit_price_foreign', lastUnitPriceForeign)
  }
}}
```

### Part C — Bulk add variants modal

**File: `src/pages/purchasing/PurchaseOrderDetailPage.tsx`**

1. Add state near the other modal states:
   ```tsx
   const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false)
   ```

2. In the Order Items header (next to the existing "Add Item" button), add:
   ```tsx
   {editMode && canAddDeleteItems && (
     <Button type="button" size="sm" variant="outline"
       onClick={() => setBulkAddModalOpen(true)}>
       <Plus className="h-3 w-3 mr-1" /> Bulk Add
     </Button>
   )}
   ```

3. Add a `BulkAddVariantsModal` component at the bottom of the file.
   Props:
   ```typescript
   interface BulkAddModalProps {
     open: boolean
     onClose: () => void
     onAdd: (items: Array<{
       product_variant_id: string
       product_variant_label: string
       product_id: string
       product_name: string
       product_supplier_link: string | null
       product_photo_url: string | null
       ordered_qty: string
       unit_price_foreign: string
       discounted_unit_price_foreign: string
     }>) => void
     currency: string
     excludeVariantIds: Set<string>
   }
   ```

   Implementation:
   ```tsx
   function BulkAddVariantsModal({
     open, onClose, onAdd, currency, excludeVariantIds,
   }: BulkAddModalProps) {
     const [searchInput, setSearchInput] = useState('')
     const [activeSearch, setActiveSearch] = useState('')
     const [selected, setSelected] = useState<Set<string>>(new Set())

     const { data, isLoading } = useVariantSearch(
       { search: activeSearch || undefined, page_size: 50 },
       open,
     )
     const variants = (data?.results ?? []).filter(v => !excludeVariantIds.has(v.id))

     useEffect(() => {
       if (open) {
         setSearchInput('')
         setActiveSearch('')
         setSelected(new Set())
       }
     }, [open])

     const toggleVariant = (id: string) =>
       setSelected(prev => {
         const next = new Set(prev)
         if (next.has(id)) next.delete(id)
         else next.add(id)
         return next
       })

     const handleConfirm = () => {
       const selectedVariants = variants.filter(v => selected.has(v.id))
       const items = selectedVariants.map(v => {
         const autoFill =
           v.last_unit_price_foreign &&
           v.last_currency &&
           v.last_currency === currency &&
           parseFloat(v.last_unit_price_foreign) > 0
         return {
           product_variant_id: v.id,
           product_variant_label: `${v.name} (${v.sku_variant_code})`,
           product_id: v.product,
           product_name: v.product_name,
           product_supplier_link: v.product_supplier_link ?? null,
           product_photo_url: v.product_photo_url ?? null,
           ordered_qty: '1',
           unit_price_foreign: autoFill ? v.last_unit_price_foreign! : '',
           discounted_unit_price_foreign: '',
         }
       })
       onAdd(items)
       onClose()
     }

     return (
       <Dialog open={open} onOpenChange={o => !o && onClose()}>
         <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
           <DialogHeader>
             <DialogTitle>Bulk Add Variants</DialogTitle>
           </DialogHeader>
           <div className="flex gap-1 mb-3">
             <Input
               className="h-8 text-sm"
               placeholder="Search name or SKU..."
               value={searchInput}
               onChange={e => setSearchInput(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') setActiveSearch(searchInput) }}
             />
             <Button type="button" size="sm" variant="outline"
               onClick={() => setActiveSearch(searchInput)}>
               Search
             </Button>
           </div>
           <div className="flex-1 overflow-y-auto min-h-0 border rounded-md divide-y">
             {isLoading ? (
               <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
             ) : variants.length === 0 ? (
               <div className="p-4 text-sm text-muted-foreground text-center">No variants found</div>
             ) : (
               variants.map(v => {
                 const isChecked = selected.has(v.id)
                 const hasPrice = v.last_unit_price_foreign &&
                   v.last_currency === currency &&
                   parseFloat(v.last_unit_price_foreign) > 0
                 return (
                   <label key={v.id}
                     className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                     <input
                       type="checkbox"
                       className="h-4 w-4 shrink-0"
                       checked={isChecked}
                       onChange={() => toggleVariant(v.id)}
                     />
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium truncate">{v.name}</div>
                       <div className="text-xs text-muted-foreground">
                         {v.sku_variant_code} · {v.product_name}
                       </div>
                     </div>
                     <div className="text-xs text-right shrink-0">
                       <div className="text-muted-foreground">SOH: {v.total_available_qty}</div>
                       {hasPrice && (
                         <div className="text-primary font-medium">
                           {v.last_currency} {v.last_unit_price_foreign}
                         </div>
                       )}
                     </div>
                   </label>
                 )
               })
             )}
           </div>
           <DialogFooter className="mt-3">
             <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
             <Button
               type="button"
               size="sm"
               disabled={selected.size === 0}
               onClick={handleConfirm}
             >
               Add Selected ({selected.size})
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     )
   }
   ```

4. At the bottom of `PurchaseOrderDetailPage` (alongside the other modals), add:
   ```tsx
   <BulkAddVariantsModal
     open={bulkAddModalOpen}
     onClose={() => setBulkAddModalOpen(false)}
     onAdd={(items) => {
       for (const item of items) handleAddItemFromModal(item)
     }}
     currency={po?.currency ?? String(headerValues.currency ?? '')}
     excludeVariantIds={usedVariantIds}
   />
   ```

   Note: `handleAddItemFromModal` is already defined in the component and adds one
   draft at a time to `newItems`. Calling it in a loop for each selected item is correct.

### Part D — Dynamic grouping on PO detail page

**File: `src/pages/purchasing/PurchaseOrderDetailPage.tsx`**

1. Add state near other local state declarations:
   ```tsx
   const [groupBy, setGroupBy] = useState<string>('product')
   ```

2. Derive available grouping keys from PO detail `variant_values`. Add a `useMemo`
   near `stockMap`:
   ```tsx
   const availableGroupKeys = useMemo<string[]>(() => {
     const keySet = new Set<string>()
     for (const item of (po?.order_details ?? [])) {
       for (const key of Object.keys(item.variant_values ?? {})) {
         keySet.add(key)
       }
     }
     return Array.from(keySet)
   }, [po?.order_details])
   ```

3. In the Order Items header div (the `<div className="flex items-center gap-3">` that
   contains the avgWindow toggle), add a groupBy selector. Place it after the avgWindow
   buttons and before the "Has Discount" checkbox:
   ```tsx
   {availableGroupKeys.length > 0 && !isCreating && (
     <Select value={groupBy} onValueChange={setGroupBy}>
       <SelectTrigger className="h-6 text-xs w-32">
         <SelectValue />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="product">By Product</SelectItem>
         {availableGroupKeys.map(k => (
           <SelectItem key={k} value={k}>
             By {k.charAt(0).toUpperCase() + k.slice(1)}
           </SelectItem>
         ))}
         <SelectItem value="flat">Flat</SelectItem>
       </SelectContent>
     </Select>
   )}
   ```

4. Modify the `groupMap` build logic inside `orderItemsContent` IIFE.
   Replace the current `for (const item of visibleDetails)` loop with:
   ```tsx
   for (const item of visibleDetails) {
     let key: string
     let groupLabel: string
     let groupPhoto: string | null

     if (groupBy === 'product') {
       key = item.product_id || 'unknown'
       groupLabel = item.product_name || 'Unknown Product'
       groupPhoto = item.product_photo_url ?? null
     } else if (groupBy === 'flat') {
       key = item.id
       groupLabel = item.product_variant_name || item.product_name || ''
       groupPhoto = null
     } else {
       const dimValue = item.variant_values?.[groupBy] ?? 'Other'
       key = dimValue
       groupLabel = dimValue
       groupPhoto = null
     }

     if (!groupMap.has(key)) {
       groupMap.set(key, {
         groupKey: key,
         productName: groupLabel,
         productSupplierLink: groupBy === 'product' ? item.product_supplier_link : null,
         productPhotoUrl: groupPhoto,
         existingItems: [],
         newItemsList: [],
       })
     }
     groupMap.get(key)!.existingItems.push(item)
   }
   ```

   When `groupBy !== 'product'`, `newItems` are always added to a special "new items"
   group. Keep the existing `if (editMode && canAddDeleteItems)` loop for newItems
   unchanged (it still groups by `product_id || new-{_tempId}`).

5. Reset `groupBy` to `'product'` when the PO changes. Add to the existing `useEffect`
   that watches `po?.id`:
   ```tsx
   useEffect(() => {
     if (!po) return
     setGroupBy('product')
     // ... rest of existing effect
   }, [po?.id])
   ```

---

## TESTS REQUIRED

**`src/features/purchasing/VariantSearchSelect.test.tsx`** (create if missing):

1. **`test_on_select_passes_last_price`**
   - Mock `useVariantSearch` to return one variant with
     `last_unit_price_foreign: "15.50"` and `last_currency: "CNY"`
   - Render `<VariantSearchSelect value="" onSelect={fn} />`
   - Open dropdown, click the variant
   - Assert `fn` called with args including `"15.50"` and `"CNY"` as 7th and 8th args

**`src/components/modals/PurchaseOrderFormModal.test.tsx`**:

2. **`test_price_auto_fills_when_currency_matches`**
   - Render `<PurchaseOrderFormModal open onClose={vi.fn()} />`
   - Mock `useVariantSearch` to return variant with `last_unit_price_foreign: "20.00"`,
     `last_currency: "CNY"`
   - Set form currency to "CNY"
   - Open variant dropdown, select the mocked variant
   - Assert the unit_price_foreign input shows "20"

3. **`test_price_not_auto_filled_when_currency_mismatch`**
   - Same but PO currency is "USD", variant `last_currency` is "CNY"
   - Assert unit_price_foreign remains "0"

**`src/pages/purchasing/PurchaseOrderDetailPage.test.tsx`**:

4. **`test_groupby_toggle_visible_when_variant_values_exist`**
   - Render the page with a mock PO whose `order_details` contain
     items with `variant_values: { color: "Red" }`
   - Assert a "By Product" / "By Color" select or toggle is visible

5. **`test_bulk_add_modal_renders_and_selects`**
   - Click "Bulk Add" button (when editMode and canAddDeleteItems)
   - Assert `BulkAddVariantsModal` opens
   - Mock `useVariantSearch` to return 2 variants
   - Check both checkboxes
   - Assert "Add Selected (2)" button is enabled

---

## CONVENTIONS
- `groupBy` state resets to `'product'` on PO change — never persisted
- Auto-fill price only when: `last_unit_price_foreign` is non-null, non-zero AND
  `last_currency` exactly equals the current PO currency string (case-sensitive)
- `BulkAddVariantsModal` calls `handleAddItemFromModal` per item — does NOT directly
  mutate `newItems` state; uses the existing public handler
- Do not pass `hasDiscount` into `BulkAddVariantsModal`; bulk-added items always
  have empty `discounted_unit_price_foreign`; user sets discount in the table after
- When `groupBy === 'flat'`, the group header row still renders (with variant name as
  label) but shows no photo or supplier link
- Add `useVariantSearch` import to `PurchaseOrderDetailPage.tsx` if not already there

## VALIDATION
```bash
npm run type-check
npm run lint
npm run test -- --run
```
