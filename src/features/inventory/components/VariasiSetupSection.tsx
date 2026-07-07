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
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, Plus, GripVertical, ArrowLeftRight } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'

// --- SortableChip ---

interface SortableChipProps {
  option: string
  onRemove: () => void
}

function SortableChip({ option, onRemove }: SortableChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option })
  return (
    <div
      ref={setNodeRef}
      data-testid="sortable-chip"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-sm"
    >
      <span className="touch-none cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-3 w-3" />
      </span>
      <span>{option}</span>
      <button
        type="button"
        data-testid={`remove-chip-${option}`}
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-accent text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// --- VariasiRow ---

interface VariasiRowProps {
  slot: 1 | 2
  dimKey: string
  options: string[]
  hasDimStock: boolean
  onKeyChange: (key: string) => void
  onOptionsChange: (options: string[]) => void
  onRemove: () => void
  onToastError: (msg: string) => void
}

function VariasiRow({
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

// --- VariasiSetupSection (exported) ---

interface VariasiSetupSectionProps {
  dim1Key: string
  dim1Options: string[]
  dim2Key: string
  dim2Options: string[]
  showDim1: boolean
  showDim2: boolean
  hasDim1Stock: boolean
  hasDim2Stock: boolean
  onDim1KeyChange: (key: string) => void
  onDim1OptionsChange: (options: string[]) => void
  onDim2KeyChange: (key: string) => void
  onDim2OptionsChange: (options: string[]) => void
  onAddVariasi: (slot: 1 | 2) => void
  onRemoveDim1: () => void
  onRemoveDim2: () => void
  onSwapConfirmed: () => void
  onToastError: (msg: string) => void
}

export function VariasiSetupSection({
  dim1Key,
  dim1Options,
  dim2Key,
  dim2Options,
  showDim1,
  showDim2,
  hasDim1Stock,
  hasDim2Stock,
  onDim1KeyChange,
  onDim1OptionsChange,
  onDim2KeyChange,
  onDim2OptionsChange,
  onAddVariasi,
  onRemoveDim1,
  onRemoveDim2,
  onSwapConfirmed,
  onToastError,
}: VariasiSetupSectionProps) {
  const [showSwapDialog, setShowSwapDialog] = useState(false)

  const canSwap = showDim1 && showDim2 && dim1Key !== '' && dim2Key !== ''

  return (
    <div className="space-y-4">
      {showDim1 && (
        <VariasiRow
          slot={1}
          dimKey={dim1Key}
          options={dim1Options}
          hasDimStock={hasDim1Stock}
          onKeyChange={onDim1KeyChange}
          onOptionsChange={onDim1OptionsChange}
          onRemove={onRemoveDim1}
          onToastError={onToastError}
        />
      )}

      {canSwap && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSwapDialog(true)}
            className="gap-1.5 text-xs"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Tukar Variasi
          </Button>
        </div>
      )}

      {showDim2 && (
        <VariasiRow
          slot={2}
          dimKey={dim2Key}
          options={dim2Options}
          hasDimStock={hasDim2Stock}
          onKeyChange={onDim2KeyChange}
          onOptionsChange={onDim2OptionsChange}
          onRemove={onRemoveDim2}
          onToastError={onToastError}
        />
      )}

      {(!showDim1 || !showDim2) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddVariasi(showDim1 ? 2 : 1)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Variasi
        </Button>
      )}

      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tukar Variasi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tukar Variasi 1 ({dim1Key}) ↔ Variasi 2 ({dim2Key})? Foto variasi akan dikaitkan ke
            Variasi 1 yang baru.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                onSwapConfirmed()
                setShowSwapDialog(false)
              }}
            >
              Tukar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
