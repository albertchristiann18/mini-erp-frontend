import type { PurchaseOrderDetail } from '../../types/purchasing'
import client from '../../api/client'

export interface SubGroup {
  key: string
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  first_dim_value: string
  items: PurchaseOrderDetail[]
}

export async function fetchPhotoViaProxy(productId: string): Promise<string | null> {
  try {
    const response = await client.get<Blob>(`/product/${productId}/photo-proxy/`, {
      responseType: 'blob',
    })
    const blob = response.data
    return new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function groupBySubGroup(details: PurchaseOrderDetail[]): SubGroup[] {
  const map = new Map<string, SubGroup>()
  for (const item of details) {
    const keys = Object.keys(item.variant_values ?? {})
    const firstDimValue = keys.length > 0 ? (item.variant_values[keys[0]] ?? '') : ''
    const key = `${item.product_id}::${firstDimValue}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        product_id: item.product_id,
        product_name: item.product_name,
        product_supplier_link: item.product_supplier_link,
        product_photo_url: item.product_photo_url,
        first_dim_value: firstDimValue,
        items: [],
      })
    }
    map.get(key)!.items.push(item)
  }

  for (const sg of map.values()) {
    sg.items.sort((a, b) => {
      const aKeys = Object.keys(a.variant_values ?? {})
      const dim2Key = aKeys[1] ?? ''
      const dim1Key = aKeys[0] ?? ''
      const cmp2 = String(a.variant_values?.[dim2Key] ?? '').localeCompare(
        String(b.variant_values?.[dim2Key] ?? ''),
      )
      if (cmp2 !== 0) return cmp2
      return String(a.variant_values?.[dim1Key] ?? '').localeCompare(
        String(b.variant_values?.[dim1Key] ?? ''),
      )
    })
  }

  const byProduct = new Map<string, SubGroup[]>()
  for (const sg of map.values()) {
    if (!byProduct.has(sg.product_id)) byProduct.set(sg.product_id, [])
    byProduct.get(sg.product_id)!.push(sg)
  }
  const result: SubGroup[] = []
  for (const sgs of byProduct.values()) {
    sgs.sort((a, b) => a.first_dim_value.localeCompare(b.first_dim_value))
    result.push(...sgs)
  }
  return result
}
