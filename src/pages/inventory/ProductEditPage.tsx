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
  useDeleteVariantPhoto,
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
import { ArrowLeft, X, Plus, Pencil, ImagePlus } from 'lucide-react'
import type { Product, ProductPhoto, VariantDimension, VariantDimensionValue } from '../../types/inventory'
import type { SaveVariantsPayload, SaveVariantItem } from '../../api/inventory'
import { uploadVariantPhoto } from '../../api/inventory'

type VariantRow = {
  id?: string
  variantValues: Record<string, string>
  sku_variant_code: string
  base_price: number
  current_cogs: number
  total_available_qty: number
  hasStock: boolean
  removed: boolean
  photoUrl: string | null
  pendingPhoto: File | null
}

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

function getLabelForDim(dim: VariantDimension, valueId: string | undefined): string {
  if (!valueId) return ''
  return dim.values.find(v => v.id === valueId)?.label ?? valueId
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]],
  )
}

function initializeDimensions(product: Product): VariantDimension[] {
  const rawOpts = product.variant_options
  if (!rawOpts || typeof rawOpts !== 'object' || Array.isArray(rawOpts)) return []
  return Object.entries(rawOpts as Record<string, string[]>).map(([name, values], idx) => ({
    id: name,
    name,
    order: idx + 1,
    values: (values ?? []).map(v => ({ id: v, label: v })),
  }))
}

function initializeRows(product: Product): VariantRow[] {
  return (Array.isArray(product.variants) ? product.variants : [])
    .filter(v => v.is_active)
    .map(v => ({
      id: v.id,
      variantValues: v.variant_values ?? {},
      sku_variant_code: v.sku_variant_code,
      base_price: v.base_price,
      current_cogs: v.current_cogs ?? 0,
      total_available_qty: v.total_available_qty ?? 0,
      hasStock: (v.total_incoming_qty ?? 0) > 0 || (v.total_available_qty ?? 0) > 0,
      removed: false,
      photoUrl: v.photo_url ?? null,
      pendingPhoto: null,
    }))
}

function suggestSku(productSku: string, dims: VariantDimension[], vv: Record<string, string>): string {
  const parts = [productSku]
  for (const dim of dims) {
    const valId = vv[dim.id]
    if (valId) parts.push(valId.toUpperCase().replace(/-/g, ''))
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
  const deleteVariantPhotoMutation = useDeleteVariantPhoto(id ?? '')
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
  const [dimensions, setDimensions] = useState<VariantDimension[]>([])
  const [rows, setRows] = useState<VariantRow[]>([])
  const [addValueInputs, setAddValueInputs] = useState<Record<number, string>>({})
  const [addDimName, setAddDimName] = useState('')
  const [showAddDim, setShowAddDim] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [brand, setBrand] = useState('')
  const [addValueActiveIdx, setAddValueActiveIdx] = useState<number | null>(null)
  const [renamingDimIdx, setRenamingDimIdx] = useState<number | null>(null)
  const [renameDimValue, setRenameDimValue] = useState('')
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
      const dims = initializeDimensions(product)
      const initialRows = initializeRows(product)
      setDimensions(dims)
      setRows(initialRows)
    }
  }, [product?.id, isEditing])

  const categories = categoriesData?.results ?? []

  const handleAddValue = (dimIdx: number) => {
    const label = (addValueInputs[dimIdx] ?? '').trim()
    if (!label) return
    const dim = dimensions[dimIdx]
    if (dim.values.some(v => v.label === label)) {
      toast.error('Value already exists')
      return
    }

    const newValue: VariantDimensionValue = { id: label, label }

    setDimensions(prev =>
      prev.map((d, i) => (i === dimIdx ? { ...d, values: [...d.values, newValue] } : d)),
    )
    setAddValueInputs(prev => ({ ...prev, [dimIdx]: '' }))

    const otherDims = dimensions.filter((_, i) => i !== dimIdx)
    const otherDimsWithValues = otherDims.filter(d => d.values.length > 0)
    const combos =
      otherDimsWithValues.length > 0
        ? cartesian(otherDimsWithValues.map(d => d.values))
        : [[]] as VariantDimensionValue[][]

    const productSku = product?.sku_code ?? 'SKU'
    const allDimsAfterUpdate = dimensions.map((d, i) =>
      i === dimIdx ? { ...d, values: [...d.values, newValue] } : d,
    )

    const newRows: VariantRow[] = combos.map(combo => {
      const vv: Record<string, string> = { [dim.id]: newValue.id }
      otherDimsWithValues.forEach((otherDim, ci) => {
        vv[otherDim.id] = combo[ci].id
      })
      return {
        variantValues: vv,
        sku_variant_code: suggestSku(productSku, allDimsAfterUpdate, vv),
        base_price: 0,
        current_cogs: 0,
        total_available_qty: 0,
        hasStock: false,
        removed: false,
        photoUrl: null,
        pendingPhoto: null,
      }
    })

    setRows(prev => [...prev, ...newRows])
  }

  const handleRemoveValue = (dimIdx: number, val: VariantDimensionValue) => {
    const dim = dimensions[dimIdx]
    const affected = rows.filter(r => !r.removed && r.variantValues[dim.id] === val.id)
    const withStock = affected.filter(r => r.hasStock)
    if (withStock.length > 0) {
      toast.error(`Cannot remove "${val.label}" - ${withStock.length} variant(s) have stock history`)
      return
    }
    setDimensions(prev =>
      prev.map((d, i) => (i === dimIdx ? { ...d, values: d.values.filter(v => v.id !== val.id) } : d)),
    )
    setRows(prev =>
      prev.map(r => (r.variantValues[dim.id] === val.id ? { ...r, removed: true } : r)),
    )
  }

  const handleAddDimension = () => {
    const name = addDimName.trim()
    if (!name) return
    if (dimensions.length >= 3) {
      toast.error('Maximum 3 dimensions')
      return
    }
    const order = dimensions.length + 1
    const newDim: VariantDimension = { id: name, name, order, values: [] }
    setDimensions(prev => [...prev, newDim])
    setAddDimName('')
    setShowAddDim(false)
  }

  const handleDeleteDimension = (dimIdx: number) => {
    const dim = dimensions[dimIdx]
    const withStock = rows.filter(r => !r.removed && r.variantValues[dim.id] && r.hasStock)
    if (withStock.length > 0) {
      toast.error(`Cannot delete "${dim.name}" — ${withStock.length} variant(s) have stock history`)
      return
    }
    setDimensions(prev => prev.filter((_, i) => i !== dimIdx))
    setRows(prev =>
      prev.map(r =>
        r.variantValues[dim.id] ? { ...r, removed: true } : r,
      ),
    )
  }

  const handleRenameDimension = (dimIdx: number) => {
    const newName = renameDimValue.trim()
    if (!newName) return
    setDimensions(prev =>
      prev.map((d, i) => (i === dimIdx ? { ...d, name: newName } : d)),
    )
    setRenamingDimIdx(null)
    setRenameDimValue('')
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

  const handleGenerateVariants = () => {
    const activeDims = dimensions.filter(d => d.values.length > 0)
    if (activeDims.length === 0) {
      toast.error('Add dimension values first')
      return
    }
    const combos = cartesian(activeDims.map(d => d.values))
    const productSku = product?.sku_code ?? 'SKU'
    let added = 0
    const newRows: VariantRow[] = []
    for (const combo of combos) {
      const vv: Record<string, string> = {}
      activeDims.forEach((dim, i) => { vv[dim.id] = combo[i].id })
      const exists = rows.some(
        r => !r.removed && activeDims.every(d => r.variantValues[d.id] === vv[d.id]),
      )
      if (!exists) {
        newRows.push({
          variantValues: vv,
          sku_variant_code: suggestSku(productSku, dimensions, vv),
          base_price: 0,
          current_cogs: 0,
          total_available_qty: 0,
          hasStock: false,
          removed: false,
          photoUrl: null,
          pendingPhoto: null,
        })
        added++
      }
    }
    if (added === 0) {
      toast.error('All variant combinations already exist')
      return
    }
    setRows(prev => [...prev, ...newRows])
    toast.success(`Generated ${added} new variant(s)`)
  }

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

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)
    try {
      let productId = id ?? ''

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
          variants: [],
        })
        productId = created.id
      }

      const activeRows = rows.filter(r => !r.removed)
      const variantsPayload: SaveVariantsPayload = {
        variant_options: Object.fromEntries(
          dimensions.map(d => [d.name, d.values.map(v => v.label)])
        ),
        variants: activeRows.map(r => ({
          ...(r.id ? { id: r.id } : {}),
          variant_values: r.variantValues,
          sku_variant_code: r.sku_variant_code,
          base_price: r.base_price,
        })) as SaveVariantItem[],
      }

      if (!isEditing) {
        const { saveVariants: saveVariantsApi } = await import('../../api/inventory')
        await saveVariantsApi(productId, variantsPayload)
        qc.invalidateQueries({ queryKey: ['product', productId] })
        qc.invalidateQueries({ queryKey: ['products'] })
      } else {
        await saveMutation.mutateAsync(variantsPayload)
      }

      // Upload pending photos for active rows that have a pending file
      const activeRowsWithPhotos = rows
        .filter(r => !r.removed && r.id && r.pendingPhoto)
      const variantPhotoPromises = activeRowsWithPhotos.map(r =>
        uploadVariantPhoto(productId, r.id!, r.pendingPhoto!).catch(() => {}),
      )
      await Promise.allSettled(variantPhotoPromises)

      toast.success(isEditing ? 'Product saved' : 'Product created')
      navigate(`/inventory/products/${productId}`)
    } catch {
      toast.error(isEditing ? 'Failed to save product' : 'Failed to create product')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing && productLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  const activeRows = rows.filter(r => !r.removed)

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

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Variant Management</h2>
            {dimensions.length < 3 && (
              showAddDim ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Attribute name (e.g. Color)"
                    value={addDimName}
                    onChange={e => setAddDimName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddDimension() }
                    }}
                    className="max-w-[200px]"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={handleAddDimension}>Add</Button>
                  <Button type="button" size="sm" variant="ghost"
                    onClick={() => { setShowAddDim(false); setAddDimName('') }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddDim(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Attribute
                </Button>
              )
            )}
          </div>

          {dimensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attributes yet. Click &quot;Add Attribute&quot; to define variant types (e.g. Color, Size).
            </p>
          ) : (
            <div className="space-y-5">
              {dimensions.map((dim, dimIdx) => (
                <div key={dim.id}>
                  <div className="flex items-center gap-2 mb-2">
                    {renamingDimIdx === dimIdx ? (
                      <>
                        <Input
                          autoFocus
                          value={renameDimValue}
                          onChange={e => setRenameDimValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleRenameDimension(dimIdx) }
                            if (e.key === 'Escape') { setRenamingDimIdx(null); setRenameDimValue('') }
                          }}
                          className="h-7 w-32 text-sm"
                        />
                        <Button
                          type="button" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => handleRenameDimension(dimIdx)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          onClick={() => { setRenamingDimIdx(null); setRenameDimValue('') }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          {dim.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => { setRenamingDimIdx(dimIdx); setRenameDimValue(dim.name) }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                          title="Rename attribute"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDimension(dimIdx)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                          title="Delete attribute"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {dim.values.map(val => (
                      <Badge key={val.id} variant="secondary" className="gap-1 pr-1 text-sm py-1">
                        {val.label}
                        <button
                          type="button"
                          onClick={() => handleRemoveValue(dimIdx, val)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}

                    {addValueActiveIdx === dimIdx ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          placeholder={`Add ${dim.name}`}
                          value={addValueInputs[dimIdx] ?? ''}
                          onChange={e =>
                            setAddValueInputs(prev => ({ ...prev, [dimIdx]: e.target.value }))
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddValue(dimIdx)
                              setAddValueActiveIdx(null)
                            }
                            if (e.key === 'Escape') {
                              setAddValueActiveIdx(null)
                              setAddValueInputs(prev => ({ ...prev, [dimIdx]: '' }))
                            }
                          }}
                          className="h-8 w-32 text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            handleAddValue(dimIdx)
                            setAddValueActiveIdx(null)
                          }}
                        >
                          ✓
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => {
                            setAddValueActiveIdx(null)
                            setAddValueInputs(prev => ({ ...prev, [dimIdx]: '' }))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddValueActiveIdx(dimIdx)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-muted-foreground/40 text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add {dim.name}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {dimensions.length > 0 && (
            <div className="mt-6 pt-5 border-t">
              <Button type="button" variant="outline" onClick={handleGenerateVariants}>
                Generate Matrix
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Generates all missing variant combinations from the attributes above.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">
              Variant Matrix ({activeRows.length})
            </h2>

          </div>

          {activeRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No variants yet. Add attribute values and click &quot;Generate Matrix&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {dimensions.map(d => (
                      <th key={d.id} className="text-left px-4 py-3 font-medium">{d.name}</th>
                    ))}
                    <th className="text-left px-4 py-3 font-medium w-16">Photo</th>
                    <th className="text-left px-4 py-3 font-medium">SKU</th>
                    <th className="text-left px-4 py-3 font-medium w-40">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeRows.map(row => {
                    const rowIdx = rows.indexOf(row)
                    const isNew = !row.id
                    return (
                      <tr key={rowIdx}>
                        {dimensions.map(d => (
                          <td key={d.id} className="px-4 py-3 font-medium">
                            {getLabelForDim(d, row.variantValues[d.id])}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <label className="relative block w-10 h-10 rounded border-2 overflow-hidden cursor-pointer
                            border-border hover:border-primary transition-colors">
                            {row.pendingPhoto ? (
                              <img src={URL.createObjectURL(row.pendingPhoto)} alt="" className="w-full h-full object-cover" />
                            ) : row.photoUrl ? (
                              <img src={row.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImagePlus className="w-4 h-4" />
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setRows(prev =>
                                  prev.map((r, i) => (i === rowIdx ? { ...r, pendingPhoto: file } : r)),
                                )
                              }}
                            />
                          </label>
                          {(row.pendingPhoto || row.photoUrl) && isEditing && row.id && (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-destructive mt-0.5 block"
                              onClick={() => {
                                if (row.pendingPhoto) {
                                  setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, pendingPhoto: null } : r))
                                } else if (row.photoUrl && row.id) {
                                  deleteVariantPhotoMutation.mutate(row.id, {
                                    onSuccess: () =>
                                      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, photoUrl: null } : r)),
                                  })
                                }
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={row.sku_variant_code}
                            onChange={e =>
                              handleRowChange(rowIdx, 'sku_variant_code', e.target.value)
                            }
                            className="h-8 font-mono text-xs w-48"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={row.base_price}
                            onChange={e => handleRowChange(rowIdx, 'base_price', parseInt(e.target.value) || 0)}
                            className="h-8 w-32"
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.total_available_qty}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isNew ? 'secondary' : 'success'}>
                            {isNew ? 'New' : 'Active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(rowIdx)}
                            className="text-sm text-muted-foreground hover:text-destructive"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
    </div>
  )
}
