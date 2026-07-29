import { DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import type { SourcingPoolPreviewResult } from '../../../types/purchasing'

interface UploadStepProps {
  selectedFile: File | null
  onFileChange: (file: File | null) => void
  previewResult: SourcingPoolPreviewResult | null
  isPreviewPending: boolean
  isImportPending: boolean
  dimMismatchResolutions: Record<string, 'variant_code' | 'dims'>
  onDimMismatchChange: (row: string, value: 'variant_code' | 'dims') => void
  missingColorForms: Record<string, string>
  onMissingColorChange: (colorName: string, value: string) => void
  isSaveColorsPending: boolean
  onSaveAllColors: () => void
  onPreview: () => void
  onBack: () => void
  onContinue: () => void
}

export function UploadStep({
  selectedFile,
  onFileChange,
  previewResult,
  isPreviewPending,
  isImportPending,
  dimMismatchResolutions,
  onDimMismatchChange,
  missingColorForms,
  onMissingColorChange,
  isSaveColorsPending,
  onSaveAllColors,
  onPreview,
  onBack,
  onContinue,
}: UploadStepProps) {
  return (
    <>
      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/20">
        {selectedFile ? (
          <span className="text-sm font-medium">{selectedFile.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Click to select .xlsx file</span>
        )}
        <input
          type="file"
          accept=".xlsx"
          className="sr-only"
          onChange={(e) => { onFileChange(e.target.files?.[0] ?? null) }}
        />
      </label>
      <Button disabled={!selectedFile || isPreviewPending} onClick={onPreview}>
        {isPreviewPending ? 'Parsing...' : 'Preview'}
      </Button>
      {previewResult !== null && (
        <div className="space-y-4">
          {previewResult.errors.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1">
              <p className="text-xs font-medium text-amber-700">Errors — {previewResult.errors.length} rows skipped</p>
              {previewResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-amber-600">
                  {err.row != null ? `Row ${err.row}: ` : ''}{err.message ?? err.errors?.join(', ')}
                </p>
              ))}
            </div>
          )}
          {previewResult.dim_mismatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Dimension Mismatches ({previewResult.dim_mismatches.length})</p>
              <p className="text-xs text-muted-foreground">These rows have both a variant_code and dimension values that don't match. Choose which to trust:</p>
              {previewResult.dim_mismatches.map((m) => (
                <div key={m.row} className="border rounded p-2 space-y-1">
                  <p className="text-xs font-mono">Row {m.row}: variant_code="{m.variant_code}"
                    {(m.dim1_value || m.dim2_value) && ` | dims=${[m.dim1_value, m.dim2_value].filter(Boolean).join('-')}`}
                  </p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" checked={dimMismatchResolutions[String(m.row)] === 'variant_code'}
                        onChange={() => onDimMismatchChange(String(m.row), 'variant_code')} />
                      Use variant_code
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" checked={dimMismatchResolutions[String(m.row)] === 'dims'}
                        onChange={() => onDimMismatchChange(String(m.row), 'dims')} />
                      Use dimensions
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
          {previewResult.missing_colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Missing Color Abbreviations</p>
              <p className="text-xs text-muted-foreground">
                Enter abbreviations for these colors. Leave blank to use the full name in the SKU.
              </p>
              {previewResult.missing_colors.map((c) => (
                <div key={c.color_name} className="flex items-center gap-2">
                  <label className="text-xs w-36 truncate">{c.color_name}</label>
                  <Input
                    className="h-7 w-20 text-xs font-mono"
                    value={missingColorForms[c.color_name] ?? ''}
                    placeholder="e.g. DSR"
                    onChange={(e) => onMissingColorChange(c.color_name, e.target.value.toUpperCase())}
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Button type="button" size="sm" variant="outline"
                  disabled={isSaveColorsPending}
                  onClick={onSaveAllColors}>
                  Save all colors
                </Button>
                <a href="/inventory/color-abbreviations" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline">
                  Manage all colors →
                </a>
              </div>
            </div>
          )}
          {previewResult.valid.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Valid rows — {previewResult.valid.length} items</p>
              {previewResult.missing_product_names.length > 0 && (
                <p className="text-xs text-amber-600">
                  Note: {previewResult.missing_product_names.length} row(s) have no product name — you'll fill them in before importing.
                </p>
              )}
              <div className="max-h-40 overflow-y-auto border rounded text-xs">
                <table className="w-full">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Product</th>
                      <th className="px-2 py-1 text-left">Variant</th>
                      <th className="px-2 py-1 text-right">Price</th>
                      <th className="px-2 py-1 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.valid.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{row.product_name ?? '(from supplier_link)'}</td>
                        <td className="px-2 py-1">{row.variant_name}</td>
                        <td className="px-2 py-1 text-right">{row.unit_price}</td>
                        <td className="px-2 py-1 text-right">{row.qty_suggested ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewResult.valid.length > 100 && <p className="px-2 py-1 text-muted-foreground">...and {previewResult.valid.length - 100} more</p>}
              </div>
            </div>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button
          disabled={!previewResult || previewResult.valid.length === 0 || isImportPending}
          onClick={onContinue}>
          {isImportPending ? 'Processing...' : 'Continue →'}
        </Button>
      </DialogFooter>
    </>
  )
}
