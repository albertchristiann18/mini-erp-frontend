/**
 * useProductEdit — state machine for ProductEditPage.
 *
 * Owns: RHF form setup + submit logic, variant-rows state, dimension state,
 * suppliers/business-entities edit logic, photo state, derived values.
 * Components receive a view-model slice + callbacks; they never touch api/ directly.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  useSaveAnyVariants,
  useUploadAnyVariantPhoto,
  useUploadDimensionImage,
  useDeleteDimensionImage,
} from '../api/useInventory'
import { toast } from '../../lib/toast'
import type { ProductPhoto, DimensionImage } from '../../types/inventory'
import type { SaveVariantsPayload, SaveVariantItem } from '../../api/inventory'
import type { ApiError } from '../../lib/errors'
import type { VariantRow } from './types'
import {
  productSchema,
  initializeRows,
  initializeDimState,
  toDimensions,
} from './productEditHelpers'
import {
  hasDimStructureChanged,
  buildUpdatePayload,
  buildCreatePayload,
  makeNewRowsForDim1,
  makeNewRowsForDim2,
  makeDimImageUploadHandler,
  makeDimImageDeleteHandler,
} from './productEditPayload'
import type { ProductFormValues, UseProductEditResult } from './productEditHelpers'

export type { ProductFormValues, UseProductEditResult }

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProductEdit(): UseProductEditResult {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: product, isLoading: productLoading, isError: isProductError, error: productQueryError, refetch: refetchProduct } = useProduct(id ?? '')
  const productError = isProductError ? (productQueryError as unknown as ApiError) : null
  const { data: categoriesData } = useCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const saveMutation = useSaveVariants(id ?? '')
  const saveAnyVariantsMutation = useSaveAnyVariants()
  const uploadAnyVariantPhotoMutation = useUploadAnyVariantPhoto()
  const uploadDimensionImageMutation = useUploadDimensionImage(id ?? '')
  const deleteDimensionImageMutation = useDeleteDimensionImage(id ?? '')

  const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema) })
  const { reset, watch } = form

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isEditing])

  const categories = categoriesData?.results ?? []
  const selectedCategoryCode = categories.find(c => c.id === watch('category'))?.category_code ?? ''

  // ─── Handlers ───────────────────────────────────────────────────────────────

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
      const hasRemovedStock = removed.some(v => rows.some(r => !r.removed && r.variantValues[dim1Key] === v && r.hasStock))
      if (hasRemovedStock) { toast.error('Tidak dapat menghapus opsi: ada varian dengan stok'); return }
      setRows(prev => prev.map(r => !r.removed && removed.includes(r.variantValues[dim1Key] ?? '') ? { ...r, removed: true } : r))
    }
    const added = newOptions.filter(o => !dim1Options.includes(o))
    setDim1Options(newOptions)
    if (added.length > 0) {
      const newRows = makeNewRowsForDim1(added, rows, dim1Key, dim2Key, newOptions, dim2Options, product?.sku_code ?? '', selectedCategoryCode)
      if (newRows.length > 0) setRows(prev => [...prev, ...newRows])
    }
  }

  const handleDim2OptionsChange = (newOptions: string[]) => {
    if (!dim2Key) return
    const removed = dim2Options.filter(o => !newOptions.includes(o))
    if (removed.length > 0) {
      const hasRemovedStock = removed.some(v => rows.some(r => !r.removed && r.variantValues[dim2Key] === v && r.hasStock))
      if (hasRemovedStock) { toast.error('Tidak dapat menghapus opsi: ada varian dengan stok'); return }
      setRows(prev => prev.map(r => !r.removed && removed.includes(r.variantValues[dim2Key] ?? '') ? { ...r, removed: true } : r))
    }
    const added = newOptions.filter(o => !dim2Options.includes(o))
    setDim2Options(newOptions)
    if (added.length > 0) {
      const newRows = makeNewRowsForDim2(added, rows, dim1Key, dim2Key, dim1Options, newOptions, product?.sku_code ?? '', selectedCategoryCode)
      if (newRows.length > 0) setRows(prev => [...prev, ...newRows])
    }
  }

  const handleAddVariasi = (slot: 1 | 2) => { if (slot === 1) setShowDim1(true); else setShowDim2(true) }
  const handleRemoveDim1 = () => setRemoveDimConfirm(1)
  const handleRemoveDim2 = () => setRemoveDimConfirm(2)

  const confirmRemoveDim = () => {
    if (removeDimConfirm === 1) {
      if (dim1Key) setRows(prev => prev.map(r => dim1Key && r.variantValues[dim1Key] ? { ...r, removed: true } : r))
      setShowDim1(false); setShowDim2(false); setDim1Key(''); setDim1Options([]); setDim2Key(''); setDim2Options([])
    } else if (removeDimConfirm === 2) {
      if (dim2Key) setRows(prev => prev.map(r => dim2Key && r.variantValues[dim2Key] ? { ...r, removed: true } : r))
      setShowDim2(false); setDim2Key(''); setDim2Options([])
    }
    setRemoveDimConfirm(null)
  }

  const handleSwapConfirmed = () => {
    const imagesToDelete = dimensionImages.filter(di => di.dim_key === dim1Key).map(di => ({ dimKey: di.dim_key, dimValue: di.dim_value }))
    if (imagesToDelete.length > 0) {
      setPendingDimImageDeletions(prev => [...prev, ...imagesToDelete])
      setDimensionImages(prev => prev.filter(di => di.dim_key !== dim1Key))
    }
    const oldDim1Key = dim1Key; const oldDim1Opts = dim1Options
    setDim1Key(dim2Key); setDim1Options(dim2Options); setDim2Key(oldDim1Key); setDim2Options(oldDim1Opts)
  }

  const handleBulkFillPrice = (price: number) =>
    setRows(prev => prev.map(r => !r.removed ? { ...r, base_price: price } : r))

  const handleDimensionImageUpload = makeDimImageUploadHandler(id, uploadDimensionImageMutation, setDimensionImages)
  const handleDimensionImageDelete = makeDimImageDeleteHandler(id, deleteDimensionImageMutation, setDimensionImages)

  const onSubmit = async (values: ProductFormValues) => {
    if (showDim1 && showDim2 && dim1Key && dim2Key && dim1Key === dim2Key) {
      toast.error('Variasi 1 dan Variasi 2 tidak boleh memiliki nama yang sama'); return
    }
    const dimStructureChanged = isEditing && product
      ? hasDimStructureChanged(product, dim1Key, dim2Key, dim1Options, dim2Options)
      : false
    setIsSaving(true)
    let productId = id ?? ''
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: productId, data: buildUpdatePayload(values, brand, product?.specifications as Record<string, string> | undefined, dim1Key, dim2Key, dim1Options, dim2Options) })
      } else {
        const created = await createMutation.mutateAsync(buildCreatePayload(values, brand, dim1Key, dim2Key, dim1Options, dim2Options))
        productId = (created as { id: string }).id
      }
    } catch { toast.error(isEditing ? 'Failed to save product' : 'Failed to create product'); setIsSaving(false); return }
    try {
      if (pendingDimImageDeletions.length > 0 && id) {
        await Promise.allSettled(pendingDimImageDeletions.map(({ dimKey, dimValue }) => deleteDimensionImageMutation.mutateAsync({ dimKey, dimValue })))
        setPendingDimImageDeletions([])
      }
      const variantOptionsForSave: Record<string, string[]> = {}
      if (dim1Key) variantOptionsForSave[dim1Key] = dim1Options
      if (dim2Key) variantOptionsForSave[dim2Key] = dim2Options
      const activeRows = rows.filter(r => !r.removed)
      const variantsPayload: SaveVariantsPayload = { variant_options: variantOptionsForSave, variants: activeRows.map(r => ({ ...(r.id ? { id: r.id } : {}), variant_values: r.variantValues, sku_variant_code: r.sku_variant_code, base_price: r.base_price })) as SaveVariantItem[] }
      if (!isEditing) await saveAnyVariantsMutation.mutateAsync({ productId, data: variantsPayload })
      else await saveMutation.mutateAsync(variantsPayload)
      const activeRowsWithPhotos = rows.filter(r => !r.removed && r.id && r.pendingPhoto)
      await Promise.allSettled(activeRowsWithPhotos.map(r => uploadAnyVariantPhotoMutation.mutateAsync({ productId, variantId: r.id!, image: r.pendingPhoto! }).catch(() => {})))
      if (dimStructureChanged) toast.warning('Struktur variasi berubah — listing Shopee mungkin perlu disinkronkan ulang')
      toast.success(isEditing ? 'Product saved' : 'Product created')
      navigate(`/inventory/products/${productId}`)
    } catch { toast.error('Info produk tersimpan. Gagal menyimpan varian — coba lagi.') }
    finally { setIsSaving(false) }
  }

  return {
    isEditing, id, form, isSaving, product, productLoading, productError, isProductError, refetchProduct,
    categories, selectedCategoryCode,
    photos, pendingFiles, setPhotos, setPendingFiles, brand, setBrand,
    dim1Key, dim1Options, dim2Key, dim2Options, showDim1, showDim2,
    dimensionImages, removeDimConfirm, setRemoveDimConfirm, setDim1Key, setDim2Key, rows,
    productSuppliersData, suppliersLoading, suppliersData,
    newSupplierSelectedId, newSupplierLink, supplierSearch, showAttachSupplierModal,
    setNewSupplierSelectedId, setNewSupplierLink, setSupplierSearch, setShowAttachSupplierModal,
    createProductSupplierMutation, deleteProductSupplierMutation,
    assignments, availableBEs, attachedMarketplaceIds,
    showAttachBEModal, attachingBEId, setShowAttachBEModal, setAttachingBEId,
    attachBEMutation, detachBEMutation,
    handleAddProductSupplier, handleRemoveRow, handleRowChange,
    handleDim1OptionsChange, handleDim2OptionsChange, handleAddVariasi,
    handleRemoveDim1, handleRemoveDim2, confirmRemoveDim, handleSwapConfirmed,
    handleBulkFillPrice, handleDimensionImageUpload, handleDimensionImageDelete, onSubmit,
  }
}
