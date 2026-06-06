import { useState, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useWarehouses } from '../../hooks/useInventory'
import { useCreatePurchaseOrder, useReplenishment } from '../../hooks/usePurchasing'
import type { ReplenishmentItem } from '../../types/purchasing'
import { VariantSearchSelect } from '../../features/purchasing/VariantSearchSelect'
import { toast } from '../../lib/toast'

const itemSchema = z.object({
  product_variant_id: z.string().min(1, 'Variant required'),
  product_id: z.string().optional(),
  product_name: z.string().optional(),
  product_supplier_link: z.string().nullable().optional(),
  ordered_qty: z.number().min(1, 'Min 1'),
  unit_price_foreign: z.number().min(0, 'Required'),
  discounted_unit_price_foreign: z.number().min(0).optional(),
})

const schema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  currency: z.string().optional(),
  exchange_rate: z.number().positive('Must be > 0').optional(),
  order_details: z.array(itemSchema).min(1, 'At least one item required'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function PurchaseOrderFormModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { data: warehousesData } = useWarehouses()
  const createMutation = useCreatePurchaseOrder((id) => {
    toast.success('Purchase order created')
    onClose()
    navigate(`/purchasing/orders/${id}`)
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'CNY', order_details: [{ product_variant_id: '', product_id: '', product_name: '', product_supplier_link: null, ordered_qty: 1, unit_price_foreign: 0, discounted_unit_price_foreign: undefined }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'order_details' })
  const [hasDiscount, setHasDiscount] = useState(false)
  const [avgWindow, setAvgWindow] = useState<7 | 30>(30)
  const { data: replenishData } = useReplenishment()
  const stockMap = useMemo<Map<string, ReplenishmentItem>>(() => {
    const m = new Map<string, ReplenishmentItem>()
    for (const item of replenishData?.results ?? []) m.set(item.variant_id, item)
    return m
  }, [replenishData])

  const handleClose = () => { reset(); setHasDiscount(false); onClose() }

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = {
      ...values,
      order_details: values.order_details.map(({ product_variant_id, ordered_qty, unit_price_foreign, discounted_unit_price_foreign }) => ({
        product_variant_id,
        ordered_qty,
        unit_price_foreign,
        ...(hasDiscount && discounted_unit_price_foreign != null
          ? { discounted_unit_price_foreign }
          : {}),
      }))
    }
    if (!payload.currency) delete payload.currency
    if (!payload.exchange_rate) delete payload.exchange_rate
    try {
      await createMutation.mutateAsync(payload)
    } catch {
      toast.error('Failed to create purchase order')
    }
  }

  const warehouses = warehousesData?.results ?? []
  const watchedItems = watch('order_details')
  const currencySymbols: Record<string, string> = {
    CNY: '¥', USD: '$', EUR: '€', SGD: 'S$', MYR: 'RM', IDR: 'Rp',
  }
  const currSymbol = currencySymbols[watch('currency') ?? 'CNY'] ?? ''

  type ProductGroup = {
    productId: string | undefined
    productName: string
    productSupplierLink: string | null | undefined
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
          <div className="grid grid-cols-3 gap-3">
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
                onValueChange={(v) => setValue('currency', v)}
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
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_variant_id: '', product_id: '', product_name: '', product_supplier_link: null, ordered_qty: 1, unit_price_foreign: 0, discounted_unit_price_foreign: undefined })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
            </div>
            {errors.order_details?.root && (
              <p className="text-xs text-red-500">{errors.order_details.root.message}</p>
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
                              onSelect={(id, _label, productId, productName, productSupplierLink) => {
                                setValue(`order_details.${i}.product_variant_id`, id, { shouldValidate: true })
                                setValue(`order_details.${i}.product_id`, productId)
                                setValue(`order_details.${i}.product_name`, productName)
                                setValue(`order_details.${i}.product_supplier_link`, productSupplierLink)
                              }}
                              placeholder="Select variant"
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
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-red-500 hover:text-red-600 self-end">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {variantId && (
                          <VariantStockStrip variantId={variantId} stockMap={stockMap} avgWindow={avgWindow} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create PO'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VariantStockStrip({
  variantId,
  stockMap,
  avgWindow,
}: {
  variantId: string
  stockMap: Map<string, ReplenishmentItem>
  avgWindow: 7 | 30
}) {
  const stats = stockMap.get(variantId)
  if (!stats) return null
  const avg = avgWindow === 7 ? stats.avg_sales_7d : stats.avg_sales_30d
  const doi = avg > 0 ? Math.round((stats.stock_on_hand + stats.incoming_qty) / avg) : null
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
    </div>
  )
}
