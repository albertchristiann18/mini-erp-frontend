import type { PurchaseOrderDetail } from '../../types/purchasing'

export interface SubGroup {
  key: string
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  first_dim_value: string
  items: PurchaseOrderDetail[]
}

export function groupBySubGroup(details: PurchaseOrderDetail[], groupByKey?: string | null): SubGroup[] {
  const map = new Map<string, SubGroup>()
  for (const item of details) {
    const keys = Object.keys(item.variant_values ?? {})
    const firstDimValue =
      groupByKey === undefined
        ? (keys.length > 0 ? (item.variant_values[keys[0]] ?? '') : '')
        : groupByKey === null
          ? ''
          : (item.variant_values[groupByKey] ?? '')
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
      const allKeys = Object.keys(a.variant_values ?? {})
      let sortKeys: string[]
      if (groupByKey === undefined) {
        sortKeys = allKeys.length > 1 ? [allKeys[1], allKeys[0]] : allKeys
      } else if (groupByKey === null) {
        sortKeys = allKeys
      } else {
        sortKeys = allKeys.filter(k => k !== groupByKey)
      }
      for (const k of sortKeys) {
        const cmp = String(a.variant_values?.[k] ?? '').localeCompare(
          String(b.variant_values?.[k] ?? ''),
          undefined,
          { numeric: true },
        )
        if (cmp !== 0) return cmp
      }
      return 0
    })
  }

  const byProduct = new Map<string, SubGroup[]>()
  for (const sg of map.values()) {
    if (!byProduct.has(sg.product_id)) byProduct.set(sg.product_id, [])
    byProduct.get(sg.product_id)!.push(sg)
  }
  const result: SubGroup[] = []
  for (const sgs of byProduct.values()) {
    sgs.sort((a, b) => a.first_dim_value.localeCompare(b.first_dim_value, undefined, { numeric: true }))
    result.push(...sgs)
  }
  return result
}
