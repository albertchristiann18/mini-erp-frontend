/**
 * Payload builders, row-generator helpers, and dimension-image handler factories
 * for useProductEdit. Split from productEditHelpers to keep each file under 300 lines.
 */
import type React from 'react'
import type { Product, VariantDimension, DimensionImage } from '../../types/inventory'
import type { VariantRow } from './types'
import type { ProductFormValues } from './productEditHelpers'
import { toDimensions } from './productEditHelpers'
import { toast } from '../../lib/toast'

// ─── Dimension change detection ───────────────────────────────────────────────

export function hasDimStructureChanged(
  product: Product,
  dim1Key: string, dim2Key: string,
  dim1Options: string[], dim2Options: string[],
): boolean {
  return (
    (product.dim1_key ?? '') !== dim1Key ||
    (product.dim2_key ?? '') !== dim2Key ||
    JSON.stringify(product.dim1_options ?? []) !== JSON.stringify(dim1Options) ||
    JSON.stringify(product.dim2_options ?? []) !== JSON.stringify(dim2Options)
  )
}

// ─── Submit payload builders ──────────────────────────────────────────────────

export function buildUpdatePayload(
  values: ProductFormValues,
  brand: string,
  specifications: Record<string, string> | undefined,
  dim1Key: string, dim2Key: string,
  dim1Options: string[], dim2Options: string[],
): Record<string, unknown> {
  return {
    name: values.name, description: values.description, category: values.category,
    is_active: values.is_active, weight: values.weight ?? 0, length: values.length ?? 0,
    width: values.width ?? 0, height: values.height ?? 0,
    specifications: { ...(specifications ?? {}), Merek: brand },
    dim1_key: dim1Key, dim2_key: dim2Key, dim1_options: dim1Options, dim2_options: dim2Options,
  }
}

export function buildCreatePayload(
  values: ProductFormValues,
  brand: string,
  dim1Key: string, dim2Key: string,
  dim1Options: string[], dim2Options: string[],
): Record<string, unknown> {
  return {
    name: values.name, category: values.category, description: values.description,
    weight: values.weight ?? 0, length: values.length ?? 0,
    width: values.width ?? 0, height: values.height ?? 0,
    specifications: { Merek: brand },
    dim1_key: dim1Key, dim2_key: dim2Key, dim1_options: dim1Options, dim2_options: dim2Options,
    variants: [],
  }
}

// ─── Row generators for dimension option additions ────────────────────────────

export function suggestSku(
  productSku: string,
  dims: VariantDimension[],
  vv: Record<string, string>,
  categoryCode?: string,
): string {
  const parts: string[] = []
  if (categoryCode) parts.push(categoryCode.toUpperCase())
  if (productSku) parts.push(productSku.toUpperCase())
  for (const dim of dims) {
    const valId = vv[dim.id]
    if (valId) parts.push(valId.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  }
  return parts.join('-')
}

/** Build new VariantRow entries for dim1 additions (given new dim1 value, existing dim2 values). */
export function makeNewRowsForDim1(
  added: string[], rows: VariantRow[],
  dim1Key: string, dim2Key: string, dim1NewOptions: string[], dim2Options: string[],
  productSku: string, categoryCode: string,
): VariantRow[] {
  const newRows: VariantRow[] = []
  for (const newVal of added) {
    if (dim2Key && dim2Options.length > 0) {
      for (const d2Val of dim2Options) {
        const vv = { [dim1Key]: newVal, [dim2Key]: d2Val }
        const exists = rows.some(r => !r.removed && r.variantValues[dim1Key] === newVal && r.variantValues[dim2Key] === d2Val)
        if (!exists) newRows.push({ variantValues: vv, sku_variant_code: suggestSku(productSku, toDimensions(dim1Key, dim1NewOptions, dim2Key, dim2Options), vv, categoryCode), base_price: 0, current_cogs: 0, total_available_qty: 0, hasStock: false, removed: false, photoUrl: null, pendingPhoto: null })
      }
    } else {
      const vv = { [dim1Key]: newVal }
      const exists = rows.some(r => !r.removed && r.variantValues[dim1Key] === newVal)
      if (!exists) newRows.push({ variantValues: vv, sku_variant_code: suggestSku(productSku, toDimensions(dim1Key, dim1NewOptions, dim2Key, dim2Options), vv, categoryCode), base_price: 0, current_cogs: 0, total_available_qty: 0, hasStock: false, removed: false, photoUrl: null, pendingPhoto: null })
    }
  }
  return newRows
}

/** Build new VariantRow entries for dim2 additions (given new dim2 value, existing dim1 values). */
export function makeNewRowsForDim2(
  added: string[], rows: VariantRow[],
  dim1Key: string, dim2Key: string, dim1Options: string[], dim2NewOptions: string[],
  productSku: string, categoryCode: string,
): VariantRow[] {
  const newRows: VariantRow[] = []
  for (const newVal of added) {
    for (const d1Val of dim1Options) {
      const vv = { [dim1Key]: d1Val, [dim2Key]: newVal }
      const exists = rows.some(r => !r.removed && r.variantValues[dim1Key] === d1Val && r.variantValues[dim2Key] === newVal)
      if (!exists) newRows.push({ variantValues: vv, sku_variant_code: suggestSku(productSku, toDimensions(dim1Key, dim1Options, dim2Key, dim2NewOptions), vv, categoryCode), base_price: 0, current_cogs: 0, total_available_qty: 0, hasStock: false, removed: false, photoUrl: null, pendingPhoto: null })
    }
  }
  return newRows
}

// ─── Dimension image mutation handler factories ───────────────────────────────

interface DimImageUploadMutation {
  mutateAsync: (args: { dimKey: string; dimValue: string; photo: File }) => Promise<{ photo_url?: string | null }>
}
interface DimImageDeleteMutation {
  mutateAsync: (args: { dimKey: string; dimValue: string }) => Promise<unknown>
}

export function makeDimImageUploadHandler(
  id: string | undefined,
  uploadMutation: DimImageUploadMutation,
  setDimensionImages: React.Dispatch<React.SetStateAction<DimensionImage[]>>,
) {
  return async (dimKey: string, dimValue: string, file: File) => {
    if (!id) return
    try {
      const result = await uploadMutation.mutateAsync({ dimKey, dimValue, photo: file })
      const photoUrl = result.photo_url ?? ''
      setDimensionImages(prev => {
        const filtered = prev.filter(di => !(di.dim_key === dimKey && di.dim_value === dimValue))
        return [...filtered, { dim_key: dimKey, dim_value: dimValue, photo_url: photoUrl }]
      })
    } catch { toast.error('Gagal mengupload foto variasi') }
  }
}

export function makeDimImageDeleteHandler(
  id: string | undefined,
  deleteMutation: DimImageDeleteMutation,
  setDimensionImages: React.Dispatch<React.SetStateAction<DimensionImage[]>>,
) {
  return async (dimKey: string, dimValue: string) => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync({ dimKey, dimValue })
      setDimensionImages(prev => prev.filter(di => !(di.dim_key === dimKey && di.dim_value === dimValue)))
    } catch { toast.error('Gagal menghapus foto variasi') }
  }
}
