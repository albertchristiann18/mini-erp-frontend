import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCategories, useCreateProduct } from '../../hooks/useInventory'
import { MASTER_CATEGORIES } from '../../constants/masterCategories'
import { toast } from '../../lib/toast'
import { PhotoUploadGrid } from '../inventory/PhotoUploadGrid'
import type { ProductPhoto } from '../../types/inventory'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  master_category_key: z.string().min(1, 'Master category is required'),
  description: z.string().min(25, 'Description must be at least 25 characters'),
  variant_name: z.string().min(1, 'Variant name is required'),
  variant_sku: z.string().min(1, 'Variant SKU is required'),
  selling_price: z.number().min(0),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function ProductFormModal({ open, onClose }: Props) {
  const { data: categoriesData } = useCategories()
  const createMutation = useCreateProduct()
  const [photos, setPhotos] = useState<ProductPhoto[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { selling_price: 0 },
  })

  const handleClose = () => {
    reset()
    setPhotos([])
    setPendingFiles([])
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      sku: values.sku,
      category: values.category,
      description: values.description,
      variants: [{
        name: values.variant_name,
        sku: `${values.sku}-${values.variant_sku}`,
        base_price: values.selling_price,
        marketplace_listings: [],
      }],
    }
    try {
      await createMutation.mutateAsync(payload)
      toast.success('Product created')
      handleClose()
    } catch {
      toast.error('Failed to create product')
    }
  }

  const categories = categoriesData?.results ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Product Name" error={errors.name?.message} required>
              <Input {...register('name')} placeholder="e.g. T-Shirt Basic" />
            </FormField>
            <FormField label="SKU" error={errors.sku?.message} required>
              <Input {...register('sku')} placeholder="e.g. TSH-001" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category" error={errors.category?.message} required>
              <Select
                value={watch('category')}
                onValueChange={(v) => setValue('category', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Master Category" error={errors.master_category_key?.message} required>
              <Select
                value={watch('master_category_key')}
                onValueChange={(v) => setValue('master_category_key', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select master category" /></SelectTrigger>
                <SelectContent>
                  {MASTER_CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Description" error={errors.description?.message} required>
            <Textarea {...register('description')} placeholder="Enter product description (min 25 characters)" />
            <p className="text-xs text-muted-foreground mt-1">
              {watch('description')?.length || 0}/25 minimum characters
            </p>
          </FormField>
          <PhotoUploadGrid
            productId={null}
            photos={photos}
            pendingFiles={pendingFiles}
            onPhotosChange={setPhotos}
            onPendingFilesChange={setPendingFiles}
          />
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Initial Variant</p>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Variant Name" error={errors.variant_name?.message} required>
                <Input {...register('variant_name')} placeholder="e.g. S / Red" />
              </FormField>
              <FormField label="Variant SKU Suffix" error={errors.variant_sku?.message} required>
                <Input {...register('variant_sku')} placeholder="e.g. S-RED" />
              </FormField>
              <FormField label="Selling Price" error={errors.selling_price?.message} required>
                <Input type="number" {...register('selling_price', { valueAsNumber: true })} placeholder="0" />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}