/**
 * Shared helpers and types for useProductEdit:
 * schema, result interface, row initialisation, dimension-state inference.
 *
 * Payload builders and row generators live in productEditPayload.ts.
 */
import { z } from 'zod'
import type { UseFormReturn } from 'react-hook-form'
import type { Product, VariantDimension, ProductPhoto, DimensionImage, Category, ProductSupplier, Supplier, ProductBusinessEntity, BusinessEntity, PaginatedResponse } from '../../types/inventory'
import type { ApiError } from '../../lib/errors'
import type { VariantRow } from './types'

// ─── Form schema ──────────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(25, 'Description must be at least 25 characters').max(3000, 'Description cannot exceed 3000 characters'),
  weight: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})
export type ProductFormValues = z.infer<typeof productSchema>

// ─── Hook result type ─────────────────────────────────────────────────────────

export interface SupplierMutationResult {
  mutateAsync: (data: { supplier_id: string; supplier_link?: string | null }) => Promise<ProductSupplier>
  isPending: boolean
}

export interface DeleteSupplierMutationResult {
  mutate: (id: string) => void
  isPending: boolean
}

export interface AttachBEMutationResult {
  mutate: (id: string, options?: {
    onSuccess?: () => void
    onError?: (err: unknown) => void
  }) => void
  isPending: boolean
}

export interface DetachBEMutationResult {
  mutate: (id: string, options?: {
    onSuccess?: () => void
    onError?: () => void
  }) => void
  isPending: boolean
}

export interface UseProductEditResult {
  // routing
  isEditing: boolean
  id: string | undefined

  // form
  form: UseFormReturn<ProductFormValues>
  isSaving: boolean

  // product + categories
  product: Product | undefined
  productLoading: boolean
  productError: ApiError | null
  isProductError: boolean
  refetchProduct: () => void
  categories: Category[]
  selectedCategoryCode: string

  // photos
  photos: ProductPhoto[]
  pendingFiles: File[]
  setPhotos: (photos: ProductPhoto[]) => void
  setPendingFiles: (files: File[]) => void

  // brand
  brand: string
  setBrand: (v: string) => void

  // dimension state
  dim1Key: string
  dim1Options: string[]
  dim2Key: string
  dim2Options: string[]
  showDim1: boolean
  showDim2: boolean
  dimensionImages: DimensionImage[]
  removeDimConfirm: 1 | 2 | null
  setRemoveDimConfirm: (v: 1 | 2 | null) => void
  setDim1Key: (key: string) => void
  setDim2Key: (key: string) => void

  // variant rows
  rows: VariantRow[]

  // suppliers
  productSuppliersData: PaginatedResponse<ProductSupplier> | undefined
  suppliersLoading: boolean
  suppliersData: PaginatedResponse<Supplier> | undefined
  newSupplierSelectedId: string
  newSupplierLink: string
  supplierSearch: string
  showAttachSupplierModal: boolean
  setNewSupplierSelectedId: (v: string) => void
  setNewSupplierLink: (v: string) => void
  setSupplierSearch: (v: string) => void
  setShowAttachSupplierModal: (v: boolean) => void
  createProductSupplierMutation: SupplierMutationResult
  deleteProductSupplierMutation: DeleteSupplierMutationResult

  // business entities
  assignments: ProductBusinessEntity[]
  availableBEs: BusinessEntity[]
  attachedMarketplaceIds: Set<string>
  showAttachBEModal: boolean
  attachingBEId: string
  setShowAttachBEModal: (v: boolean) => void
  setAttachingBEId: (v: string) => void
  attachBEMutation: AttachBEMutationResult
  detachBEMutation: DetachBEMutationResult

  // handlers
  handleAddProductSupplier: () => Promise<void>
  handleRemoveRow: (idx: number) => void
  handleRowChange: (idx: number, field: 'sku_variant_code' | 'base_price', value: string | number) => void
  handleDim1OptionsChange: (newOptions: string[]) => void
  handleDim2OptionsChange: (newOptions: string[]) => void
  handleAddVariasi: (slot: 1 | 2) => void
  handleRemoveDim1: () => void
  handleRemoveDim2: () => void
  confirmRemoveDim: () => void
  handleSwapConfirmed: () => void
  handleBulkFillPrice: (price: number) => void
  handleDimensionImageUpload: (dimKey: string, dimValue: string, file: File) => Promise<void>
  handleDimensionImageDelete: (dimKey: string, dimValue: string) => Promise<void>
  onSubmit: (values: ProductFormValues) => Promise<void>
}

// ─── Row / dimension helpers ───────────────────────────────────────────────────

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

export function initializeDimState(product: Product): {
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

export function toDimensions(
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
