import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { toast } from '../../../lib/toast'
import { useDownloadSourcingPoolTemplate, usePreviewSourcingPool, useImportAndAdd, useUpsertColorAbbreviation, useResolveSourcingConflicts } from '../hooks/useSourcingPool'
import { SkuConflictResolver, type ConflictResolution } from './SkuConflictResolver'
import type { SourcingPoolPreviewResult, ImportAndAddResult, ResolveSourcingConflictsResult } from '../../../types/purchasing'

interface SourcingImportWizardProps {
  open: boolean
  onClose: () => void
  poId: string
  supplierId: string
  supplierName: string
}

type WizardStep = 'download' | 'upload' | 'resolve_conflicts' | 'result'

const stepLabel = (step: WizardStep): string => {
  switch (step) {
    case 'download': return 'Step 1 of 4: Download Template'
    case 'upload': return 'Step 2 of 4: Upload and Preview'
    case 'resolve_conflicts': return 'SKU Conflicts'
    case 'result': return 'Done'
  }
}

export function SourcingImportWizard({ open, onClose, poId, supplierId, supplierName }: SourcingImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('download')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewResult, setPreviewResult] = useState<SourcingPoolPreviewResult | null>(null)
  const [dimMismatchResolutions, setDimMismatchResolutions] = useState<Record<string, 'variant_code' | 'dims'>>({})
  const [missingColorForms, setMissingColorForms] = useState<Record<string, string>>({})
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [pendingNameOverrides, setPendingNameOverrides] = useState<Record<string, string>>({})
  const [addResult, setAddResult] = useState<ImportAndAddResult | null>(null)
  const [resolveResult, setResolveResult] = useState<ResolveSourcingConflictsResult | null>(null)
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, ConflictResolution>>({})

  const downloadMutation = useDownloadSourcingPoolTemplate()
  const previewMutation = usePreviewSourcingPool()
  const upsertColorMutation = useUpsertColorAbbreviation()
  const importAndAddMutation = useImportAndAdd()
  const resolveConflictsMutation = useResolveSourcingConflicts()

  const handleClose = () => {
    setStep('download')
    setSelectedFile(null)
    setPreviewResult(null)
    setDimMismatchResolutions({})
    setMissingColorForms({})
    setShowNameDialog(false)
    setPendingNameOverrides({})
    setAddResult(null)
    setResolveResult(null)
    setConflictResolutions({})
    onClose()
  }

  const handlePreview = () => {
    if (!selectedFile) return
    previewMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setPreviewResult(data)
        setDimMismatchResolutions(
          Object.fromEntries(data.dim_mismatches.map((m) => [String(m.row), 'variant_code' as const]))
        )
        setMissingColorForms(
          Object.fromEntries(data.missing_colors.map((c) => [c.color_name, '']))
        )
      },
      onError: () => toast.error('Failed to parse file. Make sure you used the template.'),
    })
  }

  const callImport = () => {
    const patchedRows = previewResult!.valid.map((row) => {
      const override = pendingNameOverrides[String(row.row)]
      if (override) return { ...row, product_name: override }
      return row
    })
    importAndAddMutation.mutate(
      {
        poId,
        data: {
          supplier_id: supplierId,
          rows: patchedRows,
          dim_mismatch_resolutions: dimMismatchResolutions,
        },
      },
      {
        onSuccess: (result) => {
          setAddResult(result)
          if (result.sku_conflicts.length > 0) {
            setConflictResolutions(
              Object.fromEntries(
                result.sku_conflicts.map((c) => [
                  c.row_key,
                  { action: 'add_to_existing' as const, product_id: c.existing_product_id },
                ])
              )
            )
            setStep('resolve_conflicts')
          } else {
            setStep('result')
          }
        },
        onError: () => toast.error('Import failed. Please try again.'),
      }
    )
  }

  const totalAdded = (addResult?.added.length ?? 0) + (resolveResult?.added.length ?? 0)
  const allSkipped = [...(addResult?.skipped ?? []), ...(resolveResult?.skipped ?? [])]

  useEffect(() => {
    if (step === 'result') {
      const total = (addResult?.added.length ?? 0) + (resolveResult?.added.length ?? 0)
      toast.success(`${total} item${total !== 1 ? 's' : ''} added to PO`)
    }
  }, [step, addResult, resolveResult])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Sourcing Pool — {supplierName}</DialogTitle>
          <p className="text-xs text-muted-foreground">{stepLabel(step)}</p>
        </DialogHeader>
        {step === 'download' && (
          <>
            <p>Download the Excel template, fill in your supplier's catalogue, then upload it here.</p>
            <p className="text-xs text-muted-foreground">
              Columns: variant_code (optional), product_name, dim1_key, dim1_value, dim2_key, dim2_value,
              category_code, unit_price, discounted_price, order_qty, supplier_link, image_url, notes
            </p>
            <Button
              onClick={() => downloadMutation.mutate(undefined)}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? 'Downloading...' : 'Download Template'}
            </Button>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep('upload')}>I've filled it in →</Button>
            </DialogFooter>
          </>
        )}
        {step === 'upload' && (
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
                onChange={(e) => { setPreviewResult(null); setSelectedFile(e.target.files?.[0] ?? null) }}
              />
            </label>
            <Button disabled={!selectedFile || previewMutation.isPending} onClick={handlePreview}>
              {previewMutation.isPending ? 'Parsing...' : 'Preview'}
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
                              onChange={() => setDimMismatchResolutions((prev) => ({ ...prev, [String(m.row)]: 'variant_code' }))} />
                            Use variant_code
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="radio" checked={dimMismatchResolutions[String(m.row)] === 'dims'}
                              onChange={() => setDimMismatchResolutions((prev) => ({ ...prev, [String(m.row)]: 'dims' }))} />
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
                          onChange={(e) => setMissingColorForms((prev) => ({ ...prev, [c.color_name]: e.target.value.toUpperCase() }))}
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-3">
                      <Button type="button" size="sm" variant="outline"
                        disabled={upsertColorMutation.isPending}
                        onClick={async () => {
                          const entries = Object.entries(missingColorForms).filter(([, abbr]) => abbr.trim())
                          for (const [color_name, abbreviation] of entries) {
                            await upsertColorMutation.mutateAsync({ color_name, abbreviation: abbreviation.trim() })
                          }
                          if (selectedFile) handlePreview()
                        }}>
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
              <Button variant="outline" onClick={() => setStep('download')}>← Back</Button>
              <Button
                disabled={!previewResult || previewResult.valid.length === 0 || importAndAddMutation.isPending}
                onClick={() => {
                  if (previewResult!.missing_product_names.length > 0) {
                    setPendingNameOverrides({})
                    setShowNameDialog(true)
                  } else {
                    callImport()
                  }
                }}>
                {importAndAddMutation.isPending ? 'Processing...' : 'Continue →'}
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 'resolve_conflicts' && addResult && (
          <SkuConflictResolver
            conflicts={addResult.sku_conflicts}
            resolutions={conflictResolutions}
            onResolutionChange={(rowKey, resolution) => setConflictResolutions(prev => ({ ...prev, [rowKey]: resolution }))}
            onConfirm={() => resolveConflictsMutation.mutate(
              {
                poId,
                data: {
                  resolutions: addResult.sku_conflicts.map((c) => {
                    const r = conflictResolutions[c.row_key]
                    return {
                      row: c.row,
                      action: r.action,
                      ...(r.action === 'add_to_existing' && r.product_id ? { product_id: r.product_id } : {}),
                    }
                  }),
                },
              },
              {
                onSuccess: (res) => { setResolveResult(res); setStep('result') },
                onError: () => toast.error('Failed to resolve conflicts. Please try again.'),
              }
            )}
            isPending={resolveConflictsMutation.isPending}
          />
        )}
        {step === 'result' && (
          <>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-lg font-semibold">{totalAdded} item{totalAdded !== 1 ? 's' : ''} added to PO</p>
            </div>
            {allSkipped.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  {allSkipped.length} item{allSkipped.length !== 1 ? 's' : ''} skipped
                </summary>
                <div className="mt-2 space-y-1">
                  {allSkipped.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {s.product_name || s.item_id}{s.variant_name ? ` — ${s.variant_name}` : ''}: {s.reason}
                    </p>
                  ))}
                </div>
              </details>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
        {showNameDialog && previewResult && (
          <Dialog open={showNameDialog} onOpenChange={(o) => { if (!o) setShowNameDialog(false) }}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Missing Product Names</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                Some rows have no product name. Enter names below, or leave blank to skip those rows.
              </p>
              {previewResult.missing_product_names.map((mpn) => (
                <div key={mpn.row} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">Row {mpn.row}</span>
                  <span className="text-xs flex-1 truncate">
                    {(mpn.supplier_link ?? [mpn.dim1_value, mpn.dim2_value].filter(Boolean).join(' ')) || '(no identifier)'}
                  </span>
                  <Input
                    className="h-7 w-40 text-xs"
                    placeholder="Product name..."
                    value={pendingNameOverrides[String(mpn.row)] ?? ''}
                    onChange={(e) => setPendingNameOverrides((prev) => ({ ...prev, [String(mpn.row)]: e.target.value }))}
                  />
                </div>
              ))}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNameDialog(false)}>Cancel</Button>
                <Button onClick={() => { setShowNameDialog(false); callImport() }}>Confirm & Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
