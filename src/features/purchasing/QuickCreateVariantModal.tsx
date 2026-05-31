import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useCreateProduct, useCategories } from '../../hooks/useInventory'
import { toast } from '../../lib/toast'

const schema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productSku: z.string().min(1, 'SKU is required'),
  categoryId: z.string().optional(),
  variantName: z.string().min(1, 'Variant name is required'),
  variantSkuSuffix: z.string().min(1, 'Variant SKU suffix is required'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (variantId: string, variantLabel: string) => void
  companyId?: string
}

export function QuickCreateVariantModal({ open, onClose, onCreated }: Props) {
  const { data: categoriesData } = useCategories()
  const createMutation = useCreateProduct()
  const categories = categoriesData?.results ?? []

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    const skuVariantCode = `${values.productSku}-${values.variantSkuSuffix}`.toUpperCase()
    const description = `${values.productName} (created via PO - update description in product settings)`

    const payload: Record<string, unknown> = {
      name: values.productName,
      description,
      variants: [{
        name: values.variantName,
        sku_variant_code: skuVariantCode,
        base_price: 0,
        marketplace_listings: [],
      }],
    }
    if (values.categoryId) {
      payload.category_id = values.categoryId
    }

    try {
      const created = await createMutation.mutateAsync(payload)
      const variant = created.variants[0]
      if (variant) {
        const label = `${values.variantName} (${skuVariantCode})`
        onCreated(variant.id, label)
        toast.success(`Product "${values.productName}" created`)
        handleClose()
      }
    } catch {
      toast.error('Failed to create product')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Product Name" error={errors.productName?.message} required>
              <Input {...register('productName')} placeholder="e.g. Kaos Polos" autoFocus />
            </FormField>
            <FormField label="Product SKU" error={errors.productSku?.message} required>
              <Input {...register('productSku')} placeholder="e.g. KAO-001" />
            </FormField>
          </div>
          <FormField label="Category" error={undefined}>
            <Select
              value={watch('categoryId') ?? ''}
              onValueChange={(v) => setValue('categoryId', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">First Variant</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Variant Name" error={errors.variantName?.message} required>
                <Input {...register('variantName')} placeholder="e.g. Blue / M" />
              </FormField>
              <FormField label="SKU Suffix" error={errors.variantSkuSuffix?.message} required>
                <Input {...register('variantSkuSuffix')} placeholder="e.g. BLU-M" />
              </FormField>
            </div>
            {watch('productSku') && watch('variantSkuSuffix') && (
              <p className="text-xs text-muted-foreground mt-1">
                Full SKU: <span className="font-mono font-medium">{`${watch('productSku')}-${watch('variantSkuSuffix')}`.toUpperCase()}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create & Select'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
