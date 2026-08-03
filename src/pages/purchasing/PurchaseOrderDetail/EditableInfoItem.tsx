/**
 * EditableInfoItem — a labeled field that shows either editable input or readonly text.
 */
import { Input } from '../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { HEADER_FIELD_CONFIG } from './headerFieldConfig'

interface EditableInfoItemProps {
  field: string; label: string; value: string | number | null | undefined
  editMode: boolean; editable: boolean; headerValues: Record<string, string | File>
  setHeaderField: (field: string, value: string | File) => void
}

export function EditableInfoItem({ field, label, value, editMode, editable, headerValues, setHeaderField }: EditableInfoItemProps) {
  const cfg = HEADER_FIELD_CONFIG[field]
  if (editMode && editable && cfg) {
    if (cfg.inputType === 'select' && cfg.options) {
      return (
        <div><p className="text-xs text-muted-foreground mb-1">{label}</p>
          <Select value={String(headerValues[field] ?? value ?? '')} onValueChange={val => setHeaderField(field, val)}>
            <SelectTrigger className="h-7 text-xs" data-testid={field === 'currency' ? 'currency-select-trigger' : undefined}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{cfg.options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
          </Select></div>
      )
    }
    if (cfg.inputType === 'file') {
      const existingUrl = typeof value === 'string' && value ? value : null
      return (
        <div><p className="text-xs text-muted-foreground mb-1">{label}</p>
          <div className="space-y-1">{existingUrl && <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View current</a>}
            <input type="file" accept="application/pdf,image/*" className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground"
              onChange={e => { const file = e.target.files?.[0]; if (file) setHeaderField(field, file) }} /></div></div>
      )
    }
    return (
      <div><p className="text-xs text-muted-foreground mb-1">{label}</p>
        <Input type={cfg.inputType} step={cfg.step} className="h-7 text-xs" value={String(headerValues[field] ?? '')} onChange={e => setHeaderField(field, e.target.value)} /></div>
    )
  }
  return <div><p className="text-xs text-muted-foreground mb-1">{label}</p><p className="text-sm font-semibold">{value ?? '—'}</p></div>
}
