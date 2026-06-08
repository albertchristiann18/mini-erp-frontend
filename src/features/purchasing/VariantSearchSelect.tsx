import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { useVariantSearch } from '../../hooks/useInventory'
import { QuickCreateVariantModal } from './QuickCreateVariantModal'

interface Props {
  value: string
  selectedLabel?: string
  onSelect: (id: string, label: string, productId: string, productName: string, productSupplierLink: string | null, productPhotoUrl: string | null) => void
  placeholder?: string
  excludeVariantIds?: Set<string>
}

export function VariantSearchSelect({ value, selectedLabel: externalSelectedLabel, onSelect, placeholder = 'Select variant', excludeVariantIds }: Props) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [internalSelectedLabel, setInternalSelectedLabel] = useState('')
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const { data, isLoading } = useVariantSearch(
    { search: activeSearch || undefined, page_size: 10 },
    open,
  )

  const variants = (data?.results ?? []).filter(v => !excludeVariantIds?.has(v.id))

  const handleSearch = () => setActiveSearch(searchInput)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setActiveSearch(searchInput)
    }
  }

  const handleSelect = (id: string, label: string, productId: string, productName: string, productSupplierLink: string | null, productPhotoUrl: string | null) => {
    setInternalSelectedLabel(label)
    onSelect(id, label, productId, productName, productSupplierLink, productPhotoUrl)
    setOpen(false)
    setSearchInput('')
    setActiveSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex h-7 w-full items-center justify-between gap-1 rounded-md border px-2 text-xs',
          'bg-background hover:bg-accent transition-colors',
          value ? 'text-foreground' : 'text-muted-foreground',
        )}
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate">{value ? (internalSelectedLabel || externalSelectedLabel || placeholder) : placeholder}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-card shadow-lg">
          <div className="flex gap-1 border-b p-2">
            <Input
              className="h-7 text-xs"
              placeholder="Search name or SKU..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7 shrink-0"
              onClick={handleSearch}
            >
              <Search className="h-3 w-3" />
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
            ) : variants.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No variants found</div>
            ) : (
              variants.map(v => (
                <button
                  key={v.id}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors"
                  onClick={() => handleSelect(v.id, `${v.name} (${v.sku_variant_code})`, v.product, v.product_name, v.product_supplier_link ?? null, v.product_photo_url ?? null)}
                >
                  <div className="font-medium">{v.name}</div>
                  <div className="text-muted-foreground">
                    {v.sku_variant_code} · {v.product_name}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t p-2">
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs text-primary hover:bg-accent transition-colors flex items-center gap-1"
              onClick={() => { setOpen(false); setQuickCreateOpen(true) }}
            >
              <span>+</span> New product
            </button>
          </div>
        </div>
      )}

      <QuickCreateVariantModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(id, label) => {
          setInternalSelectedLabel(label)
          onSelect(id, label, '', '', null, null)
          setQuickCreateOpen(false)
        }}
      />
    </div>
  )
}
