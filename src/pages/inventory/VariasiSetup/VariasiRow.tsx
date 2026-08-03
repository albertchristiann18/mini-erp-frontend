import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { X, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'
import { SortableChip } from './SortableChip'

export interface VariasiRowProps {
  slot: 1 | 2
  dimKey: string
  options: string[]
  hasDimStock: boolean
  onKeyChange: (key: string) => void
  onOptionsChange: (options: string[]) => void
  onRemove: () => void
  onToastError: (msg: string) => void
}

export function VariasiRow({
  slot,
  dimKey,
  options,
  hasDimStock,
  onKeyChange,
  onOptionsChange,
  onRemove,
  onToastError,
}: VariasiRowProps) {
  const [addingValue, setAddingValue] = useState(false)
  const [addInput, setAddInput] = useState('')

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = options.indexOf(active.id as string)
      const newIndex = options.indexOf(over.id as string)
      onOptionsChange(arrayMove(options, oldIndex, newIndex))
    }
  }

  const handleAddOption = () => {
    const val = addInput.trim()
    if (!val) { setAddingValue(false); return }
    if (options.includes(val)) {
      onToastError('Opsi sudah ada')
      return
    }
    onOptionsChange([...options, val])
    setAddInput('')
    setAddingValue(false)
  }

  const handleRemoveSelf = () => {
    if (hasDimStock) {
      onToastError(`Tidak dapat menghapus Variasi ${slot}: ada varian dengan stok`)
    } else {
      onRemove()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-20 shrink-0">Variasi {slot}</span>
        <Input
          value={dimKey}
          onChange={(e) => onKeyChange(e.target.value)}
          readOnly={options.length > 0}
          placeholder={slot === 1 ? 'e.g. Warna' : 'e.g. Ukuran'}
          title={options.length > 0 ? 'Hapus semua opsi sebelum mengubah nama variasi' : undefined}
          className={cn('max-w-[200px] text-sm', options.length > 0 && 'bg-muted cursor-not-allowed')}
        />
        <button
          type="button"
          onClick={handleRemoveSelf}
          className="ml-auto text-muted-foreground hover:text-destructive"
          aria-label={`Remove Variasi ${slot}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-22">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={options} strategy={horizontalListSortingStrategy}>
            {options.map((opt) => (
              <SortableChip
                key={opt}
                option={opt}
                onRemove={() => onOptionsChange(options.filter((o) => o !== opt))}
              />
            ))}
          </SortableContext>
        </DndContext>

        {addingValue ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddOption() }
                if (e.key === 'Escape') { setAddingValue(false); setAddInput('') }
              }}
              placeholder="Tambah opsi..."
              className="h-7 w-32 text-sm"
            />
            <Button type="button" size="sm" variant="outline" className="h-7" onClick={handleAddOption}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setAddingValue(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Tambah opsi
          </Button>
        )}
      </div>
    </div>
  )
}
