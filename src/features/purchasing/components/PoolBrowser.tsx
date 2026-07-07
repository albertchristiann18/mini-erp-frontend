import { useState, useMemo } from 'react'
import { Button } from '../../../components/ui/button'
import { PoolProductGroup } from './PoolProductGroup'
import { useSourcingPoolItems } from '../hooks/useSourcingPool'
import type { DraftPoolLine } from '../../../types/purchasing'
import type { PoolGroup, PoolLineSelection } from '../types'

interface PoolBrowserProps {
  supplierId: string
  newItemKeys: Set<string>
  onAddLines: (lines: DraftPoolLine[]) => void
}

export function PoolBrowser({ supplierId, newItemKeys, onAddLines }: PoolBrowserProps) {
  const { data, isLoading, isError } = useSourcingPoolItems(supplierId)
  const items = data?.items ?? []

  const groups = useMemo<PoolGroup[]>(() => {
    const map = new Map<string, PoolGroup>()
    for (const item of items) {
      const groupKey = item.product_name ?? item.supplier_link ?? item.id
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          product_name: item.product_name,
          group_key: groupKey,
          is_unnamed: !item.product_name,
          supplier_link: item.supplier_link,
          image_proxy_url: item.image_proxy_url,
          items: [],
        })
      }
      const group = map.get(groupKey)!
      if (!group.image_proxy_url && item.image_proxy_url) {
        group.image_proxy_url = item.image_proxy_url
      }
      group.items.push(item)
    }
    return Array.from(map.values())
  }, [items])

  const [groupSelections, setGroupSelections] = useState<Record<string, PoolLineSelection[]>>({})
  const [selectionResetKey, setSelectionResetKey] = useState(0)

  const handleGroupSelectionChange = (groupKey: string, selections: PoolLineSelection[]) => {
    setGroupSelections((prev) => ({ ...prev, [groupKey]: selections }))
  }

  const allSelected: PoolLineSelection[] = Object.values(groupSelections).flat()

  const handleAddToPoClick = () => {
    onAddLines(
      allSelected.map((s) => ({
        sourcing_item_id: s.sourcing_item_id,
        product_name: s.product_name,
        variant_name: s.variant_name,
        ordered_qty: s.ordered_qty,
        unit_price_foreign: s.unit_price_foreign,
        image_proxy_url: s.image_proxy_url,
        variant_id: s.variant_id,
      })),
    )
    setGroupSelections({})
    setSelectionResetKey((k) => k + 1)
  }

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading pool items...</p>
  if (isError) return <p className="text-xs text-red-500">Failed to load sourcing pool</p>
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {groups.length} products · {items.length} total variants
        </p>
        {allSelected.length > 0 && (
          <span className="text-xs text-foreground font-medium">
            {allSelected.length} selected
          </span>
        )}
      </div>
      <div className="max-h-[320px] overflow-y-auto space-y-2">
        {groups.map((group, idx) => (
          <PoolProductGroup
            key={`${group.group_key}-${selectionResetKey}`}
            group={group}
            defaultExpanded={idx < 3}
            newItemKeys={newItemKeys}
            onSelectionChange={handleGroupSelectionChange}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={allSelected.length === 0}
        onClick={handleAddToPoClick}
      >
        Add {allSelected.length > 0 ? `${allSelected.length} items` : 'to PO'}
      </Button>
    </div>
  )
}
