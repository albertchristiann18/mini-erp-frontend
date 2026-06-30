export type VariantRow = {
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
