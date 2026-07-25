import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical } from 'lucide-react'

export interface SortableChipProps {
  option: string
  onRemove: () => void
}

export function SortableChip({ option, onRemove }: SortableChipProps) {
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
