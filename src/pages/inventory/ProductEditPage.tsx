import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useSaveVariants,
  useCategories,
  useProductSuppliers,
  useCreateProductSupplier,
  useDeleteProductSupplier,
  useSuppliers,
  useProductBusinessEntities,
  useAttachBusinessEntity,
  useDetachBusinessEntity,
  useBusinessEntities,
} from '../../hooks/useInventory'
import { toast } from '../../lib/toast'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { PhotoUploadGrid } from '../../components/inventory/PhotoUploadGrid'
import { ArrowLeft, X, Plus } from 'lucide-react'
import type { Product, ProductPhoto, VariantDimension, DimensionImage } from '../../types/inventory'
import type { SaveVariantsPayload, SaveVariantItem } from '../../api/inventory'
import { uploadVariantPhoto, uploadDimensionImage, deleteDimensionImage, saveVariants as saveVariantsApi } from '../../api/inventory'
import { VariasiSetupSection } from '../../features/inventory/components/VariasiSetupSection'
import { DaftarVariasiTable } from '../../features/inventory/components/DaftarVariasiTable'
import type { VariantRow } from '../../features/inventory/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(25, 'Description must be at least 25 characters').max(3000, 'Description cannot exceed 3000 characters'),
  weight: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

// eslint-disable-next-line react-refresh/only-export-components
export function initializeRows(product: Product, dims: VariantDimension[]): VariantRow[] {
  const dimNames = new Set(dims.map(d => d.name))
  return (Array.isArray(product.variants) ? product.variants : [])
    .filter(v => v.is_active)
    .map(v => {
      let variantValues: Record<string, string> = v.variant_values ?? {}

      const unmatchedKeys = Object.keys(variantValues).filter(k => !dimNames.has(k))
      const unmatchedDims = dims.filter(d => !(d.name in variantValues))
      if (unmatchedKeys.length > 0 && unmatchedKeys.length === unmatchedDims.length) {
        const repaired = { ...variantValues }
        unmatchedDims.forEach((dim, i) => {
          repaired[dim.name] = variantValues[unmatchedKeys[i]]
          delete repaired[unmatchedKeys[i]]
        })
        variantValues = repaired
      }

      return {
        id: v.id,
        variantValues,
        sku_variant_code: v.sku_variant_code,
        base_price: v.base_price,
        current_cogs: v.current_cogs ?? 0,
        total_available_qty: v.total_available_qty ?? 0,
        hasStock: (v.total_incoming_qty ?? 0) > 0 || (v.total_available_qty ?? 0) > 0,
        removed: false,
        photoUrl: v.photo_url ?? null,
        pendingPhoto: null,
      }
    })
}

function initializeDimState(product: Product): {
  dim1Key: string; dim1Options: string[]; dim2Key: string; dim2Options: string[]
} {
  if (product.dim1_key) {
    return {
      dim1Key: product.dim1_key,
      dim1Options: product.dim1_options ?? [],
      dim2Key: product.dim2_key ?? '',
      dim2Options: product.dim2_options ?? [],
    }
  }
  // Backward compat: infer from variant_options (pre-Phase B products)
  const rawOpts = product.variant_options
  if (!rawOpts || typeof rawOpts !== 'object' || Array.isArray(rawOpts)) {
    return { dim1Key: '', dim1Options: [], dim2Key: '', dim2Options: [] }
  }
  const entries = Object.entries(rawOpts as Record<string, string[]>)
  return {
    dim1Key: entries[0]?.[0] ?? '',
    dim1Options: entries[0]?.[1] ?? [],
    dim2Key: entries[1]?.[0] ?? '',
    dim2Options: entries[1]?.[1] ?? [],
  }
}

function toDimensions(
  dim1Key: string,
  dim1Options: string[],
  dim2Key: string,
  dim2Options: string[],
): VariantDimension[] {
  const dims: VariantDimension[] = []
  if (dim1Key) dims.push({ id: dim1Key, name: dim1Key, order: 1, values: dim1Options.map(v => ({ id: v, label: v })) })
  if (dim2Key) dims.push({ id: dim2Key, name: dim2Key, order: 2, values: dim2Options.map(v => ({ id: v, label: v })) })
  return dims
}

function suggestSku(productSku: string, dims: VariantDimension[], vv: Record<string, string>, categoryCode?: string): string {
  const parts: string[] = []
  if (categoryCode) parts.push(categoryCode.toUpperCase())
  if (productSku) parts.push(productSku.toUpperCase())
  for (const dim of dims) {
    const valId = vv[dim.id]
    if (valId) parts.push(valId.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  }
  return parts.join('-')
}

export default function ProductEditPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: product, isLoading: productLoading } = useProduct(id ?? '')
  const { data: categoriesData } = useCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const saveMutation = useSaveVariants(id ?? '')
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const [photos, setPhotos] = useState<ProductPhoto[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [rows, setRows] = useState<VariantRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [brand, setBrand] = useState('')
  const [dim1Key, setDim1Key] = useState('')
  const [dim1Options, setDim1Options] = useState<string[]>([])
  const [dim2Key, setDim2Key] = useState('')
  const [dim2Options, setDim2Options] = useState<string[]>([])
  const [showDim1, setShowDim1] = useState(false)
  const [showDim2, setShowDim2] = useState(false)
  const [dimensionImages, setDimensionImages] = useState<DimensionImage[]>([])
  const [pendingDimImageDeletions, setPendingDimImageDeletions] = useState<
    Array<{ dimKey: string; dimValue: string }>
  >([])
  const [removeDimConfirm, setRemoveDimConfirm] = useState<1 | 2 | null>(null)
const [newSupplierSelectedId, setNewSupplierSelectedId] = useState('')
const [newSupplierLink, setNewSupplierLink] = useState('')
const [supplierSearch, setSupplierSearch] = useState('')
const [showAttachBEModal, setShowAttachBEModal] = useState(false)
const [attachingBEId, setAttachingBEId] = useState('')
const [showAttachSupplierModal, setShowAttachSupplierModal] = useState(false)

const { data: productSuppliersData, isLoading: suppliersLoading } = useProductSuppliers(id ?? '')
const createProductSupplierMutation = useCreateProductSupplier(id ?? '')
const deleteProductSupplierMutation = useDeleteProductSupplier(id ?? '')
const { data: suppliersData } = useSuppliers(supplierSearch ? { search: supplierSearch } : undefined)

const { data: productBEData } = useProductBusinessEntities(id ?? '')
const attachBEMutation = useAttachBusinessEntity(id ?? '')
const detachBEMutation = useDetachBusinessEntity(id ?? '')
const { data: allBEData } = useBusinessEntities({ page_size: 100, is_active: 'true' })

const assignments = productBEData?.results ?? []
const attachedMarketplaceIds = new Set(assignments.map(a => a.marketplace_id))
const availableBEs = (allBEData?.results ?? []).filter(be => be.is_active)

  useEffect(() => {
    if (product && isEditing) {
      reset({
        name: product.name,
        category: product.category_id,
        description: product.description,
        is_active: product.is_active,
        weight: product.weight ?? 0,
        length: product.length ?? 0,
        width: product.width ?? 0,
        height: product.height ?? 0,
      })
      setBrand(product.specifications?.Merek ?? product.specifications?.Brand ?? '')
      setPhotos(product.photos ?? [])
      const dimState = initializeDimState(product)
      setDim1Key(dimState.dim1Key)
      setDim1Options(dimState.dim1Options)
      setDim2Key(dimState.dim2Key)
      setDim2Options(dimState.dim2Options)
      setShowDim1(!!dimState.dim1Key || dimState.dim1Options.length > 0)
      setShowDim2(!!dimState.dim2Key || dimState.dim2Options.length > 0)
      setDimensionImages(product.dimension_images ?? [])
      const dims = toDimensions(dimState.dim1Key, dimState.dim1Options, dimState.dim2Key, dimState.dim2Options)
      setRows(initializeRows(product, dims))
      setPendingDimImageDeletions([])
    }
  }, [product?.id, isEditing])

  const categories = categoriesData?.results ?? []
  const selectedCategoryCode = categories.find(c => c.id === watch('category'))?.category_code ?? ''

  const handleAddProductSupplier = async () => {
    if (!newSupplierSelectedId) return
    try {
      await createProductSupplierMutation.mutateAsync({
        supplier_id: newSupplierSelectedId,
        supplier_link: newSupplierLink || null,
      })
      setNewSupplierSelectedId('')
      setNewSupplierLink('')
      setSupplierSearch('')
      toast.success('Supplier linked')
    } catch {
      toast.error('Failed to link supplier')
    }
  }

  const handleRemoveRow = (idx: number) => {
    if (rows[idx].hasStock) {
      toast.error('Cannot remove - this variant has stock history')
      return
    }
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, removed: true } : r)))
  }

  const handleRowChange = (
    idx: number,
    field: 'sku_variant_code' | 'base_price',
    value: string | number,
  ) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const handleDim1OptionsChange = (newOptions: string[]) => {
    if (!dim1Key) return
    const removed = dim1Options.filter(o => !newOptions.includes(o))
    if (removed.length > 0) {
      const hasRemovedStock = removed.some(removedVal =>
        rows.some(r => !r.removed && r.variantValues[dim1Key] === removedVal && r.hasStock)
      )
      if (hasRemovedStock) {
        toast.error('Tidak dapat menghapus opsi: ada varian dengan stok')
        return
      }
      setRows(prev =>
        prev.map(r =>
          !r.removed && removed.includes(r.variantValues[dim1Key] ?? '')
            ? { ...r, removed: true }
            : r
        )
      )
    }
    const added = newOptions.filter(o => !dim1Options.includes(o))
    setDim1Options(newOptions)
    if (added.length > 0) {
      const productSku = product?.sku_code ?? ''
      const newRows: VariantRow[] = []
      for (const newVal of added) {
        if (dim2Key && dim2Options.length > 0) {
          for (const d2Val of dim2Options) {
            const vv = { [dim1Key]: newVal, [dim2Key]: d2Val }
            const exists = rows.some(r => !r.removed && r.variantValues[dim1Key] === newVal && r.variantValues[dim2Key] === d2Val)
            if (!exists) newRows.push({ variantValues: vv, sku_variant_code: suggestSku(productSku, toDimensions(dim1Key, newOptions, dim2Key, dim2Options), vv, selectedCategoryCode), base_price: 0, current_cogs: 0, total_available_qty: 0, hasStock: false, removed: false, photoUrl: null, pendingPhoto: null })
          }
        } else {
          const vv = { [dim1Key]: newVal }
          const exists = rows.some(r => !r.removed && r.variantValues[dim1Key] === newVal)
          if (!exists) newRows.push({ variantValues: vv, sku_variant_code: suggestSku(productSku, toDimensions(dim1Key, newOptions, dim2Key, dim2Options), vv, selectedCategoryCode), base_price: 0, current_cogs: 0, total_available_qty: 0, hasStock: false, removed: false, photoUrl: null, pendingPhoto: null })
        }
      }
      if (newRows.length > 0) setRows(prev => [...prev, ...newRows])
    }
  }

  const handleDim2OptionsChange = (newOptions: string[]) => {
    if (!dim2Key) return
    const removed = dim2Options.filter(o => !newOptions.includes(o))
    if (removed.length > 0) {
      const hasRemovedStock = removed.some(removedVal =>
        rows.some(r => !r.removed && r.variantValues[dim2Key] === removedVal && r.hasStock)
      )
      if (hasRemovedStock) {
        toast.error('Tidak dapat menghapus opsi: ada varian dengan stok')
        return
      }
      setRows(prev =>
        prev.map(r =>
          !r.removed && removed.includes(r.variantValues[dim2Key] ?? '')
            ? { ...r, removed: true }
            : r
        )
      )
    }
    const added = newOptions.filter(o => !dim2Options.includes(o))
    setDim2Options(newOptions)
    if (added.length > 0) {
      const productSku = product?.sku_code ?? ''
      const newRows: VariantRow[] = []
      for (const newVal of added) {
        for (const d1Val of dim1Options) {
          const vv = { [dim1Key]: d1Val, [dim2Key]: newVal }
          const exists = rows.some(r => !r.removed && r.variantValues[dim1Key] === d1Val && r.variantValues[dim2Key] === newVal)
          if (!exists) newRows.push({ variantValues: vv, sku_variant_code: suggestSku(productSku, toDimensions(dim1Key, dim1Options, dim2Key, newOptions), vv, selectedCategoryCode), base_price: 0, current_cogs: 0, total_available_qty: 0, hasStock: false, removed: false, photoUrl: null, pendingPhoto: null })
        }
      }
      if (newRows.length > 0) setRows(prev => [...prev, ...newRows])
    }
  }

  const handleAddVariasi = (slot: 1 | 2) => {
    if (slot === 1) setShowDim1(true)
    else setShowDim2(true)
  }

  const handleRemoveDim1 = () => setRemoveDimConfirm(1)

  const handleRemoveDim2 = () => setRemoveDimConfirm(2)

  const confirmRemoveDim = () => {
    if (removeDimConfirm === 1) {
      if (dim1Key) setRows(prev => prev.map(r => dim1Key && r.variantValues[dim1Key] ? { ...r, removed: true } : r))
      setShowDim1(false)
      setShowDim2(false)
      setDim1Key('')
      setDim1Options([])
      setDim2Key('')
      setDim2Options([])
    } else if (removeDimConfirm === 2) {
      if (dim2Key) setRows(prev => prev.map(r => dim2Key && r.variantValues[dim2Key] ? { ...r, removed: true } : r))
      setShowDim2(false)
      setDim2Key('')
      setDim2Options([])
    }
    setRemoveDimConfirm(null)
  }

  const handleSwapConfirmed = () => {
    const imagesToDelete = dimensionImages
      .filter(di => di.dim_key === dim1Key)
      .map(di => ({ dimKey: di.dim_key, dimValue: di.dim_value }))
    if (imagesToDelete.length > 0) {
      setPendingDimImageDeletions(prev => [...prev, ...imagesToDelete])
      setDimensionImages(prev => prev.filter(di => di.dim_key !== dim1Key))
    }
    const oldDim1Key = dim1Key
    const oldDim1Opts = dim1Options
    setDim1Key(dim2Key)
    setDim1Options(dim2Options)
    setDim2Key(oldDim1Key)
    setDim2Options(oldDim1Opts)
  }

  const handleBulkFillPrice = (dim1Value: string, price: number) => {
    setRows(prev => prev.map(r => !r.removed && r.variantValues[dim1Key] === dim1Value ? { ...r, base_price: price } : r))
  }

  const handleDimensionImageUpload = async (dimKey: string, dimValue: string, file: File) => {
    if (!id) return
    try {
      const result = await uploadDimensionImage(id, dimKey, dimValue, file)
      const photoUrl = result.data.photo_url ?? ''
      setDimensionImages(prev => {
        const filtered = prev.filter(di => !(di.dim_key === dimKey && di.dim_value === dimValue))
        return [...filtered, { dim_key: dimKey, dim_value: dimValue, photo_url: photoUrl }]
      })
    } catch {
      toast.error('Gagal mengupload foto variasi')
    }
  }

  const handleDimensionImageDelete = async (dimKey: string, dimValue: string) => {
    if (!id) return
    try {
      await deleteDimensionImage(id, dimKey, dimValue)
      setDimensionImages(prev => prev.filter(di => !(di.dim_key === dimKey && di.dim_value === dimValue)))
    } catch {
      toast.error('Gagal menghapus foto variasi')
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (showDim1 && showDim2 && dim1Key && dim2Key && dim1Key === dim2Key) {
      toast.error('Variasi 1 dan Variasi 2 tidak boleh memiliki nama yang sama')
      return
    }

    const dimStructureChanged = isEditing && product && (
      (product.dim1_key ?? '') !== dim1Key ||
      (product.dim2_key ?? '') !== dim2Key ||
      JSON.stringify(product.dim1_options ?? []) !== JSON.stringify(dim1Options) ||
      JSON.stringify(product.dim2_options ?? []) !== JSON.stringify(dim2Options)
    )

    setIsSaving(true)
    let productId = id ?? ''

    // Step 1: Save product info
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: productId,
          data: {
            name: values.name,
            description: values.description,
            category: values.category,
            is_active: values.is_active,
            weight: values.weight ?? 0,
            length: values.length ?? 0,
            width: values.width ?? 0,
            height: values.height ?? 0,
            specifications: { ...(product?.specifications ?? {}), Merek: brand },
            dim1_key: dim1Key,
            dim2_key: dim2Key,
            dim1_options: dim1Options,
            dim2_options: dim2Options,
          },
        })
      } else {
        const created = await createMutation.mutateAsync({
          name: values.name,
          category: values.category,
          description: values.description,
          weight: values.weight ?? 0,
          length: values.length ?? 0,
          width: values.width ?? 0,
          height: values.height ?? 0,
          specifications: { Merek: brand },
          dim1_key: dim1Key,
          dim2_key: dim2Key,
          dim1_options: dim1Options,
          dim2_options: dim2Options,
          variants: [],
        })
        productId = created.id
      }
    } catch {
      toast.error(isEditing ? 'Failed to save product' : 'Failed to create product')
      setIsSaving(false)
      return
    }

    // Step 2: Save variants (separate error message so user knows info was saved)
    try {
      if (pendingDimImageDeletions.length > 0 && id) {
        await Promise.allSettled(
          pendingDimImageDeletions.map(({ dimKey, dimValue }) =>
            deleteDimensionImage(id, dimKey, dimValue)
          )
        )
        setPendingDimImageDeletions([])
      }

      const variantOptionsForSave: Record<string, string[]> = {}
      if (dim1Key) variantOptionsForSave[dim1Key] = dim1Options
      if (dim2Key) variantOptionsForSave[dim2Key] = dim2Options

      const activeRows = rows.filter(r => !r.removed)
      const variantsPayload: SaveVariantsPayload = {
        variant_options: variantOptionsForSave,
        variants: activeRows.map(r => ({
          ...(r.id ? { id: r.id } : {}),
          variant_values: r.variantValues,
          sku_variant_code: r.sku_variant_code,
          base_price: r.base_price,
        })) as SaveVariantItem[],
      }

      if (!isEditing) {
        await saveVariantsApi(productId, variantsPayload)
        qc.invalidateQueries({ queryKey: ['product', productId] })
        qc.invalidateQueries({ queryKey: ['products'] })
      } else {
        await saveMutation.mutateAsync(variantsPayload)
      }

      const activeRowsWithPhotos = rows.filter(r => !r.removed && r.id && r.pendingPhoto)
      await Promise.allSettled(
        activeRowsWithPhotos.map(r => uploadVariantPhoto(productId, r.id!, r.pendingPhoto!).catch(() => {}))
      )

      if (dimStructureChanged) {
        toast.warning('Struktur variasi berubah — listing Shopee mungkin perlu disinkronkan ulang')
      }
      toast.success(isEditing ? 'Product saved' : 'Product created')
      navigate(`/inventory/products/${productId}`)
    } catch {
      toast.error('Info produk tersimpan. Gagal menyimpan varian — coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing && productLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() =>
            navigate(isEditing ? `/inventory/products/${id}` : '/inventory/products')
          }
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">Inventory &gt; Products</p>
          <h1 className="text-xl font-semibold">
            {isEditing ? (product?.name ?? 'Edit Product') : 'New Product'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-12">
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
              productId={isEditing ? (id ?? null) : null}
              photos={photos}
              pendingFiles={pendingFiles}
              onPhotosChange={setPhotos}
              onPendingFilesChange={setPendingFiles}
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

        {/* Variasi Section */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-6">Variasi Produk</h2>
          <VariasiSetupSection
            dim1Key={dim1Key}
            dim1Options={dim1Options}
            dim2Key={dim2Key}
            dim2Options={dim2Options}
            showDim1={showDim1}
            showDim2={showDim2}
            hasDim1Stock={rows.some(r => !r.removed && !!dim1Key && !!r.variantValues[dim1Key] && r.hasStock)}
            hasDim2Stock={rows.some(r => !r.removed && !!dim2Key && !!r.variantValues[dim2Key] && r.hasStock)}
            onDim1KeyChange={setDim1Key}
            onDim1OptionsChange={handleDim1OptionsChange}
            onDim2KeyChange={setDim2Key}
            onDim2OptionsChange={handleDim2OptionsChange}
            onAddVariasi={handleAddVariasi}
            onRemoveDim1={handleRemoveDim1}
            onRemoveDim2={handleRemoveDim2}
            onSwapConfirmed={handleSwapConfirmed}
            onToastError={toast.error}
          />
        </div>

        {/* Daftar Variasi */}
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold">
              Daftar Variasi ({rows.filter(r => !r.removed).length})
            </h2>
          </div>
          <DaftarVariasiTable
            dim1Key={dim1Key}
            dim2Key={dim2Key}
            dim1Options={dim1Options}
            dim2Options={dim2Options}
            rows={rows}
            dimensionImages={dimensionImages}
            isEditing={isEditing}
            onRowChange={handleRowChange}
            onRemoveRow={handleRemoveRow}
            onBulkFillPrice={handleBulkFillPrice}
            onDimensionImageUpload={handleDimensionImageUpload}
            onDimensionImageDelete={handleDimensionImageDelete}
          />
        </div>

        {isEditing && (
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Suppliers</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link one or more suppliers to this product. The linked supplier URL will be used when creating purchase orders.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAttachSupplierModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Attach
              </Button>
            </div>

            {suppliersLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (productSuppliersData?.results ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No suppliers linked yet.</p>
            ) : (
              <div className="space-y-2">
                {(productSuppliersData?.results ?? []).map(ps => (
                  <div key={ps.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium shrink-0">{ps.supplier_name}</span>
                      {ps.supplier_link && (
                        <a
                          href={ps.supplier_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline truncate"
                        >
                          {ps.supplier_link}
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteProductSupplierMutation.mutate(ps.id)}
                      className="text-muted-foreground hover:text-destructive ml-4 shrink-0"
                      title="Remove supplier"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={showAttachSupplierModal} onOpenChange={(o) => { if (!o) { setShowAttachSupplierModal(false); setNewSupplierSelectedId(''); setNewSupplierLink(''); setSupplierSearch('') } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Attach Supplier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <Select value={newSupplierSelectedId} onValueChange={setNewSupplierSelectedId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1">
                          <Input
                            placeholder="Search..."
                            value={supplierSearch}
                            onChange={e => setSupplierSearch(e.target.value)}
                            className="h-7 text-xs"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        {(suppliersData?.results ?? []).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Supplier URL (optional)</p>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={newSupplierLink}
                      onChange={e => setNewSupplierLink(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setShowAttachSupplierModal(false); setNewSupplierSelectedId(''); setNewSupplierLink(''); setSupplierSearch('') }}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!newSupplierSelectedId || createProductSupplierMutation.isPending}
                    onClick={async () => {
                      await handleAddProductSupplier()
                      setShowAttachSupplierModal(false)
                    }}
                  >
                    {createProductSupplierMutation.isPending ? 'Attaching...' : 'Attach'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {isEditing && (
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Business Entities</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach this product to one or more business entities. One entity per marketplace allowed.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAttachBEModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Attach
              </Button>
            </div>

            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No business entities attached yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.business_entity_name}</span>
                      <Badge variant="outline" className="text-xs">{a.marketplace_name}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        detachBEMutation.mutate(a.id, {
                          onSuccess: () => toast.success('Detached'),
                          onError: () => toast.error('Failed to detach'),
                        })
                      }
                      className="text-muted-foreground hover:text-destructive ml-4"
                      title="Remove business entity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={showAttachBEModal} onOpenChange={setShowAttachBEModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Attach Business Entity</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Select a business entity to attach this product to. Only one entity per marketplace is allowed.
                  </p>
                  <Select value={attachingBEId} onValueChange={setAttachingBEId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBEs.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No business entities available</div>
                      ) : (
                        availableBEs.map(be => {
                          const isConflict = attachedMarketplaceIds.has(be.marketplace_id)
                          return (
                            <SelectItem
                              key={be.id}
                              value={be.id}
                              disabled={isConflict}
                            >
                              {be.name}
                              <span className="ml-1 text-muted-foreground text-xs">({be.marketplace_name})</span>
                              {isConflict && <span className="ml-1 text-xs text-muted-foreground"> — already attached</span>}
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setShowAttachBEModal(false); setAttachingBEId('') }}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!attachingBEId || attachBEMutation.isPending}
                    onClick={() => {
                      attachBEMutation.mutate(attachingBEId, {
                        onSuccess: () => {
                          toast.success('Business entity attached')
                          setShowAttachBEModal(false)
                          setAttachingBEId('')
                        },
                        onError: (err: unknown) => {
                          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                          toast.error(msg ?? 'Failed to attach')
                        },
                      })
                    }}
                  >
                    {attachBEMutation.isPending ? 'Attaching...' : 'Attach'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(isEditing ? `/inventory/products/${id}` : '/inventory/products')
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>

      <Dialog open={removeDimConfirm !== null} onOpenChange={(open) => { if (!open) setRemoveDimConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Variasi {removeDimConfirm}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {removeDimConfirm === 1
              ? `Semua baris varian untuk "${dim1Key}" akan dihapus. Tindakan ini tidak dapat dibatalkan sebelum disimpan.`
              : `Semua baris varian untuk "${dim2Key}" akan dihapus. Tindakan ini tidak dapat dibatalkan sebelum disimpan.`
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDimConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmRemoveDim}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
