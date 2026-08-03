import type React from 'react'
import type { ApiError } from '../../lib/errors'

// ─── Domain types ─────────────────────────────────────────────────────────────

export type DimensionChip = { label: string; code: string }

export type DimensionRow = {
  id: string
  name: string
  values: DimensionChip[]
  inputValue: string
}

export interface CreatedVariant {
  id: string
  label: string
  productId: string
  productName: string
  productSupplierLink: string | null
  productPhotoUrl: string | null
}

// ─── Props / Result ───────────────────────────────────────────────────────────

export interface UseQuickCreateProductProps {
  onClose: () => void
  onCreated: (variants: CreatedVariant[]) => void
  supplierId?: string
}

export interface UseQuickCreateProductResult {
  // Simple field state
  productName: string
  setProductName: (v: string) => void
  categoryId: string
  setCategoryId: (v: string) => void
  supplierLink: string
  setSupplierLink: (v: string) => void
  chosenSupplierId: string
  setChosenSupplierId: (v: string) => void

  // Photo state
  productPhoto: File | null
  productPhotoPreview: string | null
  productPhotoInputRef: React.RefObject<HTMLInputElement | null>
  handleProductPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleClearProductPhoto: () => void

  // Dimension row state
  dimensionRows: DimensionRow[]
  addDimensionRow: () => void
  removeDimensionRow: (idx: number) => void
  updateDimensionName: (idx: number, name: string) => void
  updateDimensionInputValue: (idx: number, value: string) => void
  addValueToDimension: (idx: number) => void
  removeValueFromDimension: (dimIdx: number, valIdx: number) => void
  updateValueCode: (dimIdx: number, valIdx: number, newCode: string) => void

  // Validation
  errors: Record<string, string>
  skuError: string | null
  validate: () => boolean

  // Submit
  isSubmitting: boolean
  handleSubmit: () => Promise<void>

  // Picker step
  step: 'form' | 'pick'
  createdVariants: CreatedVariant[]
  selectedIds: Set<string>
  toggleSelectedId: (id: string) => void
  handleAddSelected: () => void

  // General
  handleClose: () => void
  supplierOptions: Array<{ id: string; name: string }>
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]],
  )
}

export function isSkuConflictError(err: unknown): boolean {
  const apiErr = err as ApiError
  if (apiErr?.fieldErrors?.['sku_variant_code']) return true
  const msg = (apiErr?.message ?? '').toLowerCase()
  return msg.includes('unique') || msg.includes('already exists')
}

export type VariantPayloadItem = {
  variant_values: Record<string, string>
  sku_variant_code: string
  base_price: 0
}

/** Transforms dimension rows into the variant_options map and variants payload array. */
export function buildVariantsPayload(rows: DimensionRow[]): {
  variantOptions: Record<string, string[]>
  variantsPayload: VariantPayloadItem[]
} {
  const variantOptions: Record<string, string[]> = {}
  const codeMap: Record<string, Record<string, string>> = {}

  for (const dim of rows) {
    const dimName = dim.name.trim()
    if (dimName && dim.values.length > 0) {
      variantOptions[dimName] = dim.values.map(v => v.label)
      codeMap[dimName] = {}
      for (const v of dim.values) {
        codeMap[dimName][v.label] = v.code
      }
    }
  }

  const dimEntries = Object.entries(variantOptions)
  let variantsPayload: VariantPayloadItem[] = []
  if (dimEntries.length > 0) {
    const combos = cartesian(dimEntries.map(([, vals]) => vals))
    variantsPayload = combos.map(combo => {
      const variantValues: Record<string, string> = {}
      dimEntries.forEach(([key], i) => {
        variantValues[key] = combo[i]
      })
      const skuSuffix = combo
        .map(
          (label, i) =>
            codeMap[dimEntries[i][0]]?.[label] ??
            label.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        )
        .join('-')
      return { variant_values: variantValues, sku_variant_code: skuSuffix, base_price: 0 as const }
    })
  }

  return { variantOptions, variantsPayload }
}

/** Pure validation — returns an error map (empty = valid). */
export function validateQuickCreateForm(
  productName: string,
  categoryId: string,
  rows: DimensionRow[],
): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!productName.trim()) errs.productName = 'Product name is required'
  if (!categoryId) errs.categoryId = 'Category is required'
  rows.forEach((d, i) => {
    if (!d.name.trim()) errs[`dim_${i}_name`] = 'Dimension name is required'
    if (d.values.length === 0) errs[`dim_${i}_values`] = 'At least one value required'
    d.values.forEach((v, vi) => {
      if (!v.code.trim()) errs[`dim_${i}_val_${vi}_code`] = 'Code required'
    })
  })
  const allCodes = rows.flatMap(d => d.values.map(v => v.code.trim())).filter(Boolean)
  const seen = new Set<string>()
  for (const code of allCodes) {
    if (seen.has(code)) {
      errs['sku_duplicate'] = `Duplicate code "${code}" — each value must have a unique code.`
      break
    }
    seen.add(code)
  }
  return errs
}
