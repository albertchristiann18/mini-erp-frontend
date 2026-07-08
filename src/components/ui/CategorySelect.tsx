import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { Input } from './input'
import { useCategories } from '../../hooks/api/useInventory'
import { CategoryFormModal } from '../modals/CategoryFormModal'
import type { Category } from '../../types/inventory'

interface Props {
  value: string
  onChange: (id: string) => void
  onNewCategoryCreated?: (category: Category) => void
  error?: string
  required?: boolean
}

export function CategorySelect({ value, onChange, onNewCategoryCreated, error }: Props) {
  const { data: categoriesData } = useCategories()
  const categories = categoriesData?.results ?? []
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = categories.find(c => c.id === value)

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category_code.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (id: string) => {
    onChange(id)
    setDropdownOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(o => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? `${selected.name} (${selected.category_code})` : 'Select category'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {dropdownOpen && (
        <div className="absolute z-50 mt-1 w-full border bg-background text-foreground shadow-md rounded-md">
          <div className="p-1">
            <Input
              placeholder="Search category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-1.5 text-sm text-muted-foreground">No categories found</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={c.id === value}
                  className="px-3 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  onClick={() => handleSelect(c.id)}
                >
                  {c.name} ({c.category_code})
                </div>
              ))
            )}
          </div>
          <div className="border-t mt-1 pt-1 px-2 pb-1">
            <button
              type="button"
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm cursor-pointer"
              onClick={() => { setShowNewModal(true); setDropdownOpen(false) }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Category
            </button>
          </div>
        </div>
      )}
      <CategoryFormModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(category) => {
          onChange(category.id)
          onNewCategoryCreated?.(category)
          setShowNewModal(false)
        }}
      />
    </div>
  )
}
