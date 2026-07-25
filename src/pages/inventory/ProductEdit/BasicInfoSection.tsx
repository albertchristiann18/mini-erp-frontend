import type { UseFormReturn } from 'react-hook-form'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { PhotoUploadGrid } from '../PhotoUploadGrid'
import type { ProductPhoto, Category } from '../../../types/inventory'
import type { ProductFormValues } from '../../../hooks/inventory/useProductEdit'

interface BasicInfoSectionProps {
  form: UseFormReturn<ProductFormValues>
  categories: Category[]
  isEditing: boolean
  brand: string
  setBrand: (v: string) => void
  photos: ProductPhoto[]
  pendingFiles: File[]
  onPhotosChange: (photos: ProductPhoto[]) => void
  onPendingFilesChange: (files: File[]) => void
  productId: string | null
}

export function BasicInfoSection({
  form,
  categories,
  isEditing,
  brand,
  setBrand,
  photos,
  pendingFiles,
  onPhotosChange,
  onPendingFilesChange,
  productId,
}: BasicInfoSectionProps) {
  const { register, setValue, watch, formState: { errors } } = form

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-6">Basic Information</h2>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">
          Product Name <span className="text-destructive">*</span>
        </label>
        <div>
          <Input {...register('name')} placeholder="Enter product name" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">
          Category <span className="text-destructive">*</span>
        </label>
        <div>
          <Select
            key={`cat-${watch('category') ?? ''}-${categories.length}`}
            value={watch('category') ?? ''}
            onValueChange={v => setValue('category', v, { shouldValidate: true })}
          >
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">Brand</label>
        <Input
          value={brand}
          onChange={e => setBrand(e.target.value)}
          placeholder="e.g. Logitech"
        />
      </div>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">
          Description <span className="text-destructive">*</span>
        </label>
        <div>
          <Textarea
            {...register('description')}
            placeholder="Min 25 characters"
            className="min-h-[120px] resize-y"
            maxLength={3000}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {watch('description')?.length ?? 0} / 3000
          </p>
          {errors.description && (
            <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">Images</label>
        <PhotoUploadGrid
          productId={productId}
          photos={photos}
          pendingFiles={pendingFiles}
          onPhotosChange={onPhotosChange}
          onPendingFilesChange={onPendingFilesChange}
        />
      </div>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">Weight (gram)</label>
        <Input
          type="number"
          min="0"
          {...register('weight', { valueAsNumber: true })}
          placeholder="0"
          className="max-w-[200px]"
        />
      </div>

      <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
        <label className="font-medium text-sm pt-2.5">Dimensions (cm)</label>
        <div className="grid grid-cols-3 gap-3 max-w-[400px]">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Length</p>
            <Input type="number" min="0" {...register('length', { valueAsNumber: true })} placeholder="0" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Width</p>
            <Input type="number" min="0" {...register('width', { valueAsNumber: true })} placeholder="0" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Height</p>
            <Input type="number" min="0" {...register('height', { valueAsNumber: true })} placeholder="0" />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="grid grid-cols-[200px_1fr] items-start gap-4 mb-5">
          <label className="font-medium text-sm pt-2.5">Status</label>
          <Select
            key={`status-${String(watch('is_active'))}`}
            value={watch('is_active') === true ? 'true' : watch('is_active') === false ? 'false' : ''}
            onValueChange={v => setValue('is_active', v === 'true', { shouldValidate: true })}
          >
            <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
