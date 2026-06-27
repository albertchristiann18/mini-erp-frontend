import { useState, useMemo, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ExternalLink, Upload } from 'lucide-react'
import { SupplierFormModal } from './SupplierFormModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useWarehouses, useSuppliers } from '../../hooks/useInventory'
import { useCreatePurchaseOrder, useReplenishment } from '../../hooks/usePurchasing'
import type { ReplenishmentItem, DraftPoolLine, SourcingPoolPreviewRow } from '../../types/purchasing'
import { VariantSearchSelect } from '../../features/purchasing/VariantSearchSelect'
import { SourcingPoolImportModal } from '../../features/purchasing/components/SourcingPoolImportModal'
import { PoolBrowser } from '../../features/purchasing/components/PoolBrowser'
import { useSourcingPoolItems, useAddDraftLine } from '../../features/purchasing/hooks/useSourcingPool'
import { Badge } from '../ui/badge'
import { toast } from '../../lib/toast'

const itemSchema = z.object({
  product_variant_id: z.string(),
  product_id: z.string().optional(),
  product_name: z.string().optional(),
  product_supplier_link: z.string().nullable().optional(),
  product_photo_url: z.string().nullable().optional(),
  ordered_qty: z.number().min(1, 'Min 1'),
  unit_price_foreign: z.number().min(0, 'Required'),
  discounted_unit_price_foreign: z.number().min(0).optional(),
})

const schema = z.object({
  supplier_id: z.string().optional(),
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  currency: z.string().optional(),
  exchange_rate: z.number().positive('Must be > 0').optional().nullable().catch(undefined),
  order_details: z.array(itemSchema),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function PurchaseOrderFormModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { data: warehousesData } = useWarehouses()
  const { data: suppliersData } = useSuppliers({ active_only: 'true' })
  const createMutation = useCreatePurchaseOrder()

  const { register, handleSubmit, reset, setValue, watch, getValues, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { supplier_id: '', currency: 'CNY', order_details: [{ product_variant_id: '', product_id: '', product_name: '', product_supplier_link: null, product_photo_url: null, ordered_qty: 1, unit_price_foreign: 0, discounted_unit_price_foreign: undefined }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'order_details' })
  const [hasDiscount, setHasDiscount] = useState(false)
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false)
  const [avgWindow, setAvgWindow] = useState<7 | 30>(30)
  const [variantLabels, setVariantLabels] = useState<Record<string, string>>({})
  const [lastPriceData, setLastPriceData] = useState<Record<string, {
    lastUnitPriceForeign: string | null
    lastCurrency: string | null
    lastDiscountedUnitPriceForeign: string | null
  }>>({})
  const [draftLines, setDraftLines] = useState<DraftPoolLine[]>([])
  const [newItemKeys, setNewItemKeys] = useState<Set<string>>(new Set())
  const [showImportModal, setShowImportModal] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)

  const addDraftLineMutation = useAddDraftLine()

  const selectedSupplierId = watch('supplier_id')
  const activeSupplierId =
    selectedSupplierId && selectedSupplierId !== 'none' && selectedSupplierId !== ''
      ? selectedSupplierId
      : undefined

  const { data: poolData } = useSourcingPoolItems(activeSupplierId)
  const poolItems = poolData?.items ?? []
  const hasPoolItems = poolItems.length > 0

  const { data: replenishData } = useReplenishment()
  const stockMap = useMemo<Map<string, ReplenishmentItem>>(() => {
    const m = new Map<string, ReplenishmentItem>()
    for (const item of replenishData?.results ?? []) m.set(item.variant_id, item)
    return m
  }, [replenishData])

  const handleClose = () => { reset(); setHasDiscount(false); setVariantLabels({}); setLastPriceData({}); setDraftLines([]); setNewItemKeys(new Set()); setShowImportModal(false); setLineError(null); onClose() }

  const handleAddPoolLines = (newLines: DraftPoolLine[]) => {
    const mergedNames: string[] = []
    const updated = [...draftLines]
    for (const line of newLines) {
      const existingIdx = updated.findIndex((dl) => dl.sourcing_item_id === line.sourcing_item_id)
      if (existingIdx !== -1) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          ordered_qty: updated[existingIdx].ordered_qty + line.ordered_qty,
        }
        mergedNames.push(line.variant_name)
      } else {
        updated.push(line)
      }
    }
    setDraftLines(updated)
    for (const name of mergedNames) {
      toast.info(`Qty merged — "${name}" already in this order`)
    }
  }

  useEffect(() => {
    setNewItemKeys(new Set())
    setDraftLines([])
  }, [activeSupplierId])

  const handleImportSuccess = (importedRows: SourcingPoolPreviewRow[]) => {
    setNewItemKeys(new Set(importedRows.map((r) => `${r.product_name}|${r.variant_name}`)))
  }

  const onSubmit = async (values: FormValues) => {
    const nonEmptyDetails = values.order_details.filter(d => d.product_variant_id !== '')
    if (nonEmptyDetails.length === 0 && draftLines.length === 0) {
      setLineError('At least one item (regular variant or from sourcing pool) is required')
      return
    }
    setLineError(null)

    const payload: Record<string, unknown> = {
      ...values,
      order_details: nonEmptyDetails.map(({ product_variant_id, ordered_qty, unit_price_foreign, discounted_unit_price_foreign }) => {
        let finalPrice = unit_price_foreign
        let finalDiscountedPrice = discounted_unit_price_foreign

        if (!finalPrice || finalPrice === 0) {
          const stored = lastPriceData[product_variant_id]
          if (stored?.lastUnitPriceForeign && stored.lastCurrency === values.currency) {
            const price = parseFloat(stored.lastUnitPriceForeign)
            if (!isNaN(price) && price > 0) {
              finalPrice = price
              if (stored.lastDiscountedUnitPriceForeign) {
                const discPrice = parseFloat(stored.lastDiscountedUnitPriceForeign)
                if (!isNaN(discPrice) && discPrice > 0) finalDiscountedPrice = discPrice
              }
            }
          }
        }

        return {
          product_variant_id,
          ordered_qty,
          unit_price_foreign: finalPrice,
          ...(hasDiscount && finalDiscountedPrice != null
            ? { discounted_unit_price_foreign: finalDiscountedPrice }
            : {}),
        }
      })
    }
    if (!payload.supplier_id) delete payload.supplier_id
    if (!payload.currency) delete payload.currency
    if (!payload.exchange_rate) delete payload.exchange_rate

    try {
      const result = await createMutation.mutateAsync(payload)
      const poId = result.id

      const failedVariants: string[] = []
      for (const dl of draftLines) {
        try {
          await addDraftLineMutation.mutateAsync({
            poId,
            sourcing_item_id: dl.sourcing_item_id,
            ordered_qty: dl.ordered_qty,
            unit_price_foreign: dl.unit_price_foreign > 0 ? dl.unit_price_foreign : undefined,
          })
        } catch {
          failedVariants.push(dl.variant_name)
        }
      }

      if (failedVariants.length > 0) {
        toast.warning(
          `PO created, but these pool items could not be added: ${failedVariants.join(', ')}. Open the PO to retry.`,
        )
      } else {
        toast.success('Purchase order created')
      }

      handleClose()
      navigate(`/purchasing/orders/${poId}`)
    } catch {
      toast.error('Failed to create purchase order')
    }
  }

  const warehouses = warehousesData?.results ?? []
  const suppliers = suppliersData?.results ?? []
  const watchedItems = watch('order_details')
  const currencySymbols: Record<string, string> = {
    CNY: '¥', USD: '$', EUR: '€', SGD: 'S$', MYR: 'RM', IDR: 'Rp',
  }
  const currSymbol = currencySymbols[watch('currency') ?? 'CNY'] ?? ''

  type ProductGroup = {
    productId: string | undefined
    productName: string
    productSupplierLink: string | null | undefined
    productPhotoUrl: string | null | undefined
    indices: number[]
  }

  function groupItems(items: typeof watchedItems): ProductGroup[] {
    const map = new Map<string, ProductGroup>()
    items.forEach((item, i) => {
      const key = item.product_id || `ungrouped-${i}`
      if (!map.has(key)) {
        map.set(key, {
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          productSupplierLink: item.product_supplier_link,
          productPhotoUrl: item.product_photo_url,
          indices: [],
        })
      }
      map.get(key)!.indices.push(i)
    })
    return Array.from(map.values())
  }

  const groups = groupItems(watchedItems)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <FormField label="Supplier">
              <Select
                value={watch('supplier_id') ?? ''}
                onValueChange={(v) => setValue('supplier_id', v || undefined)}
              >
                <SelectTrigger><SelectValue placeholder="No supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                  <div className="border-t mt-1 pt-1 px-1 pb-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowNewSupplierModal(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Supplier
                    </button>
                  </div>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Warehouse" error={errors.warehouse_id?.message} required>
              <Select
                value={watch('warehouse_id')}
                onValueChange={(v) => setValue('warehouse_id', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Currency">
              <Select
                value={watch('currency')}
                onValueChange={(v) => {
                  setValue('currency', v)
                  const currentItems = getValues('order_details')
                  currentItems.forEach((item, idx) => {
                    const currentPrice = item.unit_price_foreign
                    if ((!currentPrice || currentPrice === 0) && item.product_variant_id) {
                      const stored = lastPriceData[item.product_variant_id]
                      if (stored?.lastUnitPriceForeign && stored.lastCurrency === v) {
                        const price = parseFloat(stored.lastUnitPriceForeign)
                        if (!isNaN(price) && price > 0) {
                          setValue(`order_details.${idx}.unit_price_foreign`, price, { shouldValidate: true })
                        }
                        if (hasDiscount && stored.lastDiscountedUnitPriceForeign) {
                          const discPrice = parseFloat(stored.lastDiscountedUnitPriceForeign)
                          if (!isNaN(discPrice) && discPrice > 0) {
                            setValue(`order_details.${idx}.discounted_unit_price_foreign`, discPrice)
                          }
                        }
                      }
                    }
                  })
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY (¥ Yuan)</SelectItem>
                  <SelectItem value="USD">USD ($ Dollar)</SelectItem>
                  <SelectItem value="EUR">EUR (€ Euro)</SelectItem>
                  <SelectItem value="SGD">SGD (S$ Singapore)</SelectItem>
                  <SelectItem value="MYR">MYR (RM Ringgit)</SelectItem>
                  <SelectItem value="IDR">IDR (Rp Rupiah)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Exchange Rate (IDR)">
              <Input type="number" step={0.001} placeholder="e.g. 2250" {...register('exchange_rate', { valueAsNumber: true })} />
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Order Items</p>
              <div className="flex items-center gap-3">
                <div className="flex rounded-md border overflow-hidden text-xs h-6">
                  <button
                    type="button"
                    className={`px-2 ${avgWindow === 7 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                    onClick={() => setAvgWindow(7)}
                  >7d</button>
                  <button
                    type="button"
                    className={`px-2 ${avgWindow === 30 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                    onClick={() => setAvgWindow(30)}
                  >30d</button>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasDiscount}
                    onChange={e => setHasDiscount(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Has Discount
                </label>
                {activeSupplierId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Import from Excel
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_variant_id: '', product_id: '', product_name: '', product_supplier_link: null, product_photo_url: null, ordered_qty: 1, unit_price_foreign: 0, discounted_unit_price_foreign: undefined })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
            </div>
            {(errors.order_details?.root || lineError) && (
              <p className="text-xs text-red-500">{errors.order_details?.root?.message ?? lineError}</p>
            )}
            {fields.length > 0 && (
              <div className={`grid ${hasDiscount ? 'grid-cols-[1fr_80px_100px_100px_32px]' : 'grid-cols-[1fr_80px_100px_32px]'} gap-2 pl-2`}>
                <span className="text-xs font-medium text-muted-foreground">Variant</span>
                <span className="text-xs font-medium text-muted-foreground">Qty</span>
                <span className="text-xs font-medium text-muted-foreground">Unit Price</span>
                {hasDiscount && <span className="text-xs font-medium text-muted-foreground">Disc. Price</span>}
                <span />
              </div>
            )}
            {groups.map(group => {
              const groupQty = group.indices.reduce((sum, i) => sum + (watchedItems[i]?.ordered_qty ?? 0), 0)
              const groupCost = group.indices.reduce((sum, i) => {
                const item = watchedItems[i]
                const price = hasDiscount && (item?.discounted_unit_price_foreign ?? 0) > 0
                  ? (item?.discounted_unit_price_foreign ?? 0)
                  : (item?.unit_price_foreign ?? 0)
                return sum + (item?.ordered_qty ?? 0) * price
              }, 0)
              return (
                <div key={group.productId} className="space-y-1">
                  <div className="flex items-center gap-3 px-2 py-2 bg-muted/50 rounded">
                    {group.productPhotoUrl ? (
                      <img
                        src={group.productPhotoUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted border border-dashed border-border shrink-0" />
                    )}
                    <span className="text-sm font-bold text-foreground flex-1">{group.productName}</span>
                    {group.productSupplierLink && (
                      <a href={group.productSupplierLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs font-medium">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Supplier</span>
                      </a>
                    )}
                    <span className="text-xs text-muted-foreground">Qty: <span className="font-bold text-foreground">{groupQty}</span></span>
                    <span className="text-xs text-muted-foreground">Cost: <span className="font-bold text-foreground">{currSymbol}{groupCost.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span></span>
                  </div>
                  {group.indices.map(i => {
                    const variantId = watch(`order_details.${i}.product_variant_id`)
                    return (
                      <div key={fields[i].id}>
                        <div className={`grid ${hasDiscount ? 'grid-cols-[1fr_80px_100px_100px_32px]' : 'grid-cols-[1fr_80px_100px_32px]'} gap-2 items-end pl-2`}>
                          <FormField label={''} error={errors.order_details?.[i]?.product_variant_id?.message}>
                            <VariantSearchSelect
                              value={watch(`order_details.${i}.product_variant_id`)}
                              selectedLabel={variantLabels[watch(`order_details.${i}.product_variant_id`)] || ''}
                              onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, lastCurrency, lastDiscountedUnitPriceForeign) => {
                                const currentItems = getValues('order_details')
                                const duplicateIdx = currentItems.findIndex((item, j) => j !== i && item.product_variant_id === id)
                                if (duplicateIdx !== -1) {
                                  const existingQty = currentItems[duplicateIdx].ordered_qty || 0
                                  setValue(`order_details.${duplicateIdx}.ordered_qty`, existingQty + 1, { shouldValidate: true })
                                  toast.info(`Qty merged — "${label}" already in this order`)
                                  return
                                }
                                setVariantLabels(prev => ({ ...prev, [id]: label }))
                                setValue(`order_details.${i}.product_variant_id`, id, { shouldValidate: true })
                                setValue(`order_details.${i}.product_id`, productId)
                                setValue(`order_details.${i}.product_name`, productName)
                                setValue(`order_details.${i}.product_supplier_link`, productSupplierLink)
                                setValue(`order_details.${i}.product_photo_url`, productPhotoUrl)
                                setLastPriceData(prev => ({
                                  ...prev,
                                  [id]: { lastUnitPriceForeign, lastCurrency, lastDiscountedUnitPriceForeign },
                                }))
                                const poCurrency = watch('currency')
                                if (lastUnitPriceForeign && lastCurrency && lastCurrency === poCurrency) {
                                  const price = parseFloat(lastUnitPriceForeign)
                                  if (!isNaN(price) && price > 0) {
                                    setValue(`order_details.${i}.unit_price_foreign`, price, { shouldValidate: true })
                                  }
                                  if (hasDiscount && lastDiscountedUnitPriceForeign) {
                                    const discPrice = parseFloat(lastDiscountedUnitPriceForeign)
                                    if (!isNaN(discPrice) && discPrice > 0) {
                                      setValue(`order_details.${i}.discounted_unit_price_foreign`, discPrice)
                                    }
                                  }
                                }
                              }}
                              onQuickCreated={(variants) => {
                                if (variants.length === 0) return
                                const [first, ...rest] = variants
                                setVariantLabels(prev => ({
                                  ...prev,
                                  [first.id]: first.label,
                                  ...Object.fromEntries(rest.map(v => [v.id, v.label])),
                                }))
                                setValue(`order_details.${i}.product_variant_id`, first.id, { shouldValidate: true })
                                setValue(`order_details.${i}.product_id`, first.productId)
                                setValue(`order_details.${i}.product_name`, first.productName)
                                setValue(`order_details.${i}.product_supplier_link`, first.productSupplierLink)
                                setValue(`order_details.${i}.product_photo_url`, first.productPhotoUrl)
                                for (const v of rest) {
                                  append({
                                    product_variant_id: v.id,
                                    product_id: v.productId,
                                    product_name: v.productName,
                                    product_supplier_link: v.productSupplierLink,
                                    product_photo_url: v.productPhotoUrl,
                                    ordered_qty: 1,
                                    unit_price_foreign: 0,
                                    discounted_unit_price_foreign: undefined,
                                  })
                                }
                              }}
                              placeholder="Select variant"
                              supplierId={watch('supplier_id')}
                            />
                          </FormField>
                          <FormField label={''} error={errors.order_details?.[i]?.ordered_qty?.message}>
                            <Input type="number" {...register(`order_details.${i}.ordered_qty`, { valueAsNumber: true })} />
                          </FormField>
                          <FormField label={''} error={errors.order_details?.[i]?.unit_price_foreign?.message}>
                            <Input
                              type="number"
                              step="0.001"
                              value={watch(`order_details.${i}.unit_price_foreign`) ?? ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value)
                                setValue(`order_details.${i}.unit_price_foreign`, isNaN(val) ? 0 : val, { shouldValidate: true })
                                if (hasDiscount) {
                                  setValue(`order_details.${i}.discounted_unit_price_foreign`, isNaN(val) ? 0 : val)
                                }
                              }}
                            />
                          </FormField>
                          {hasDiscount && (
                            <FormField label={''} error={errors.order_details?.[i]?.discounted_unit_price_foreign?.message}>
                              <Input
                                type="number"
                                step="0.001"
                                {...register(`order_details.${i}.discounted_unit_price_foreign`, { valueAsNumber: true })}
                              />
                            </FormField>
                          )}
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-red-500 hover:text-red-600 self-end" aria-label="Remove item" data-testid="remove-item-btn">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {variantId && (
                          <VariantStockStrip
                            variantId={variantId}
                            stockMap={stockMap}
                            avgWindow={avgWindow}
                            orderedQty={watch(`order_details.${i}.ordered_qty`) || 0}
                            onUseRec={(qty) =>
                              setValue(`order_details.${i}.ordered_qty`, qty, { shouldValidate: true })
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {draftLines.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className="text-xs font-medium text-muted-foreground px-2">
                  Sourcing Pool Lines ({draftLines.length})
                </p>
                {draftLines.map((dl, i) => (
                  <div
                    key={dl.sourcing_item_id}
                    className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end pl-2"
                  >
                    <div className="flex items-center gap-2 h-7">
                      {dl.image_proxy_url ? (
                        <img
                          src={dl.image_proxy_url}
                          alt=""
                          className="w-5 h-5 rounded object-cover border shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-muted border border-dashed border-border shrink-0" />
                      )}
                      <span className="text-xs truncate text-foreground">
                        {dl.product_name} — {dl.variant_name}
                      </span>
                      <Badge variant="info" className="text-[10px] px-1.5 py-0.5 shrink-0">Pool</Badge>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={dl.ordered_qty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setDraftLines((prev) =>
                          prev.map((l, j) =>
                            j === i ? { ...l, ordered_qty: isNaN(val) ? 1 : Math.max(1, val) } : l,
                          ),
                        )
                      }}
                    />
                    <Input
                      type="number"
                      step="0.001"
                      min={0}
                      value={dl.unit_price_foreign}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setDraftLines((prev) =>
                          prev.map((l, j) =>
                            j === i ? { ...l, unit_price_foreign: isNaN(val) ? 0 : val } : l,
                          ),
                        )
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDraftLines((prev) => prev.filter((_, j) => j !== i))}
                      className="text-red-500 hover:text-red-600 self-end"
                      aria-label="Remove draft line"
                      data-testid="remove-draft-btn"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeSupplierId && hasPoolItems && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Sourcing Pool</p>
              <PoolBrowser
                supplierId={activeSupplierId}
                newItemKeys={newItemKeys}
                onAddLines={handleAddPoolLines}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create PO'}
            </Button>
          </DialogFooter>
        </form>
        <SupplierFormModal
          open={showNewSupplierModal}
          onClose={() => setShowNewSupplierModal(false)}
          onCreated={(s) => {
            setValue('supplier_id', s.id)
            setShowNewSupplierModal(false)
          }}
        />
        {activeSupplierId && (
          <SourcingPoolImportModal
            open={showImportModal}
            onClose={() => setShowImportModal(false)}
            supplierId={activeSupplierId}
            supplierName={suppliers.find((s) => s.id === activeSupplierId)?.name ?? ''}
            onImportSuccess={handleImportSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function VariantStockStrip({
  variantId,
  stockMap,
  avgWindow,
  orderedQty,
  onUseRec,
}: {
  variantId: string
  stockMap: Map<string, ReplenishmentItem>
  avgWindow: 7 | 30
  orderedQty: number
  onUseRec?: (qty: number) => void
}) {
  const stats = stockMap.get(variantId)
  if (!stats) return null
  const avg = avgWindow === 7 ? stats.avg_sales_7d : stats.avg_sales_30d
  const doi = avg > 0 ? Math.round((stats.stock_on_hand + stats.incoming_qty) / avg) : null
  const doiAfter = avg > 0 ? Math.round((stats.stock_on_hand + stats.incoming_qty + orderedQty) / avg) : null
  const recQty = avg > 0
    ? Math.max(0, Math.ceil(90 * avg) - stats.stock_on_hand - stats.incoming_qty)
    : null
  return (
    <div className="ml-2 flex flex-wrap gap-3 pb-1.5 text-xs text-muted-foreground">
      <span>SOH: <strong className="text-foreground">{stats.stock_on_hand}</strong></span>
      <span>Incoming: <strong className="text-blue-600">{stats.incoming_qty}</strong></span>
      <span>AVG {avgWindow}d: <strong className="text-foreground">{avg.toFixed(1)}/day</strong></span>
      <span>
        DOI:{' '}
        <strong className={doi !== null && doi < 14 ? 'text-red-600' : 'text-foreground'}>
          {doi !== null ? `${doi}d` : '∞'}
        </strong>
      </span>
      <span>
        DOI after:{' '}
        <strong className={doiAfter !== null && doi !== null && doiAfter > doi ? 'text-green-600' : 'text-foreground'}>
          {doiAfter !== null ? `${doiAfter}d` : '∞'}
        </strong>
      </span>
      {recQty !== null && (
        <span>
          Rec:{' '}
          <strong className="text-foreground">{recQty}</strong>
          {onUseRec && recQty > 0 && (
            <button
              type="button"
              className="ml-1 text-[11px] text-primary hover:underline"
              onClick={() => onUseRec(recQty)}
            >
              Use
            </button>
          )}
        </span>
      )}
    </div>
  )
}
