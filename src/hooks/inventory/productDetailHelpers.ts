/**
 * productDetailHelpers — pure helpers for ProductDetailPage.
 *
 * getDimLabel: resolves a dimension value label from a dimension object.
 * fmtNum: formats a number for Indonesian locale display.
 * buildDims: builds VariantDimension[] from a product's variant_options record.
 */
import type { VariantDimension } from '../../types/inventory'

export function getDimLabel(dim: VariantDimension, valueId: string | undefined): string {
  if (!valueId) return '—'
  return dim.values.find(v => v.id === valueId)?.label ?? valueId
}

export function fmtNum(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString('id-ID')
}

export function buildDims(rawOpts: Record<string, string[]> | undefined): VariantDimension[] {
  if (!rawOpts) return []
  return Object.entries(rawOpts).map(([name, values], idx) => ({
    id: name,
    name,
    order: idx + 1,
    values: Array.isArray(values) ? values.map(v => ({ id: v, label: v })) : [],
  }))
}
