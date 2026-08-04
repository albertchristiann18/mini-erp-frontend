/**
 * Renders the per-status "required field" checklist inside StatusAdvanceModal —
 * a green check for fields already present, a red X with an inline editable
 * input (or file picker) for fields the transition check reported missing.
 */
import { Check, X } from "lucide-react"
import { Input } from "../../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { cn } from "../../../lib/utils"
import type { PurchaseOrder } from "../../../types/purchasing"
import type { FieldConfig } from "./fieldConfig"

interface RequiredFieldsListProps {
  fields: FieldConfig[]
  missingFieldSet: Set<string>
  formValues: Record<string, string | File>
  po: PurchaseOrder
  setField: (field: string, value: string | File) => void
}

export function RequiredFieldsList({ fields, missingFieldSet, formValues, po, setField }: RequiredFieldsListProps) {
  return (
    <div className="space-y-1">
      {fields.map(cfg => {
        const originallyMissing = missingFieldSet.has(cfg.field)
        const showRed = originallyMissing && !formValues[cfg.field]
        return (
          <div key={cfg.field} className={cn(
            "flex items-start gap-2 text-sm px-2 py-1.5 rounded",
            showRed && "bg-red-50 dark:bg-red-950/20"
          )}>
            {showRed
              ? <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" data-testid="x-icon" />
              : <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" data-testid="check-icon" />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", showRed && "text-red-600 dark:text-red-400")}>
                  {cfg.label}
                </span>
              </div>
              {cfg.inputType === "select" && cfg.options && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Select
                    value={String(formValues[cfg.field] ?? "")}
                    onValueChange={val => setField(cfg.field, val)}
                  >
                    <SelectTrigger
                      className="h-7 text-xs"
                      data-testid={cfg.field === "currency" ? "currency-select-trigger" : undefined}
                    >
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cfg.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {cfg.inputType !== "file" && cfg.inputType !== "select" && cfg.field !== "order_details" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    type={cfg.inputType}
                    step={cfg.step}
                    className="h-7 text-xs"
                    placeholder={cfg.label}
                    value={String(formValues[cfg.field] ?? "")}
                    onChange={e => setField(cfg.field, e.target.value)}
                  />
                  {cfg.suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{cfg.suffix}</span>}
                </div>
              )}
              {cfg.inputType === "file" && originallyMissing && (
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="mt-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) setField(cfg.field, file)
                  }}
                />
              )}
              {cfg.inputType === "file" && !originallyMissing && (() => {
                const url = String((po as unknown as Record<string, unknown>)[cfg.field] ?? "")
                return (
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View
                    </a>
                    <label className="text-xs text-muted-foreground cursor-pointer">
                      Replace
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="ml-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) setField(cfg.field, file)
                        }}
                      />
                    </label>
                  </div>
                )
              })()}
              {cfg.field === "order_details" && originallyMissing && (
                <p className="text-xs text-muted-foreground mt-0.5">Add order items via Edit before advancing.</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
