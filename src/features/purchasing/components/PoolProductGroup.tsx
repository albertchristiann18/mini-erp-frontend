import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import type { PoolGroup, PoolLineSelection } from '../types'

interface PoolProductGroupProps {
  group: PoolGroup
  defaultExpanded: boolean
  newItemKeys: Set<string>
  onSelectionChange: (groupName: string, selections: PoolLineSelection[]) => void
}

export function PoolProductGroup({ group, defaultExpanded, newItemKeys, onSelectionChange }: PoolProductGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(group.items.map((item) => [item.id, item.qty_suggested ?? 1]))
  )
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(group.items.map((item) => [item.id, parseFloat(item.unit_price) || 0]))
  )

  const notifyParent = (
    nextChecked: Record<string, boolean>,
    nextQtys: Record<string, number>,
    nextPrices: Record<string, number>,
  ) => {
    const selections: PoolLineSelection[] = group.items
      .filter((item) => nextChecked[item.id])
      .map((item) => ({
        sourcing_item_id: item.id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        ordered_qty: nextQtys[item.id] ?? item.qty_suggested ?? 1,
        unit_price_foreign: nextPrices[item.id] ?? parseFloat(item.unit_price) ?? 0,
        image_proxy_url: item.image_proxy_url,
      }))
    onSelectionChange(group.product_name, selections)
  }



  const newCount = group.items.filter((item) =>
    newItemKeys.has(`${item.product_name}|${item.variant_name}`)
  ).length

  return (
    <div>
      <div className="flex items-center gap-3 px-2 py-2 bg-muted/50 rounded">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={() => setExpanded((e) => !e)}
        >
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          {group.image_proxy_url ? (
            <img
              src={group.image_proxy_url}
              alt=""
              className="w-8 h-8 rounded object-cover border border-border shrink-0"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-muted border border-dashed border-border shrink-0" />
          )}
          <span className="text-sm font-bold text-foreground flex-1 truncate">{group.product_name}</span>
          <span className="text-xs text-muted-foreground shrink-0">{group.items.length} variants</span>
          {newCount > 0 && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0.5 shrink-0">{newCount} New</Badge>
          )}
        </button>
        {group.supplier_link && (
          <a
            href={group.supplier_link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View supplier page"
            className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {expanded && (
        <div className="pl-6 space-y-1 mt-1">
          {group.items.map((item) => {
            const isNew = newItemKeys.has(`${item.product_name}|${item.variant_name}`)
            return (
              <div key={item.id} className="grid grid-cols-[auto_1fr_70px_90px] gap-2 items-center">
                <input
                  id={`poolcheck-${item.id}`}
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={checked[item.id] ?? false}
                  onChange={(e) => {
                    const next = { ...checked, [item.id]: e.target.checked }
                    setChecked(next)
                    notifyParent(next, qtys, prices)
                  }}
                />
                <label htmlFor={`poolcheck-${item.id}`} className="flex items-center gap-1.5 min-w-0 cursor-pointer">
                  <span className="text-xs truncate">{item.variant_name}</span>
                  {isNew && (
                    <Badge variant="success" className="text-[10px] px-1 py-0.5 shrink-0">New</Badge>
                  )}
                </label>
                <Input
                  type="number"
                  min={1}
                  className="h-6 text-xs px-1"
                  value={qtys[item.id] ?? 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    const next = { ...qtys, [item.id]: isNaN(val) ? 1 : Math.max(1, val) }
                    setQtys(next)
                    notifyParent(checked, next, prices)
                  }}
                />
                <Input
                  type="number"
                  step="0.001"
                  min={0}
                  className="h-6 text-xs px-1"
                  value={prices[item.id] ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    const next = { ...prices, [item.id]: isNaN(val) ? 0 : val }
                    setPrices(next)
                    notifyParent(checked, qtys, next)
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
