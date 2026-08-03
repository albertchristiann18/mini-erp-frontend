import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { toast } from '../../../lib/toast'
import { useSourcingImportWizard, stepLabel } from '../../../hooks/purchasing/useSourcingImportWizard'
import { SkuConflictResolver } from '../SkuConflictResolver'
import { DownloadStep } from './DownloadStep'
import { UploadStep } from './UploadStep'
import { ResultStep } from './ResultStep'
import { MissingNamesDialog } from './MissingNamesDialog'

interface SourcingImportWizardProps {
  open: boolean
  onClose: () => void
  poId: string
  supplierId: string
  supplierName: string
}

export function SourcingImportWizard({ open, onClose, poId, supplierId, supplierName }: SourcingImportWizardProps) {
  const {
    step,
    setStep,
    selectedFile,
    setSelectedFile,
    previewResult,
    setPreviewResult,
    dimMismatchResolutions,
    setDimMismatchResolutions,
    missingColorForms,
    setMissingColorForms,
    showNameDialog,
    setShowNameDialog,
    pendingNameOverrides,
    setPendingNameOverrides,
    addResult,
    setResolveResult,
    conflictResolutions,
    setConflictResolutions,
    downloadMutation,
    previewMutation,
    upsertColorMutation,
    importAndAddMutation,
    resolveConflictsMutation,
    handleClose,
    handlePreview,
    callImport,
    totalAdded,
    allSkipped,
  } = useSourcingImportWizard({ poId, supplierId, onClose })

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Sourcing Pool — {supplierName}</DialogTitle>
          <p className="text-xs text-muted-foreground">{stepLabel(step)}</p>
        </DialogHeader>
        {step === 'download' && (
          <DownloadStep
            isDownloading={downloadMutation.isPending}
            onDownload={() => downloadMutation.mutate(undefined)}
            onCancel={handleClose}
            onNext={() => setStep('upload')}
          />
        )}
        {step === 'upload' && (
          <UploadStep
            selectedFile={selectedFile}
            onFileChange={(file) => { setPreviewResult(null); setSelectedFile(file) }}
            previewResult={previewResult}
            isPreviewPending={previewMutation.isPending}
            isImportPending={importAndAddMutation.isPending}
            dimMismatchResolutions={dimMismatchResolutions}
            onDimMismatchChange={(row, value) => setDimMismatchResolutions((prev) => ({ ...prev, [row]: value }))}
            missingColorForms={missingColorForms}
            onMissingColorChange={(colorName, value) => setMissingColorForms((prev) => ({ ...prev, [colorName]: value }))}
            isSaveColorsPending={upsertColorMutation.isPending}
            onSaveAllColors={async () => {
              const entries = Object.entries(missingColorForms).filter(([, abbr]) => abbr.trim())
              for (const [color_name, abbreviation] of entries) {
                await upsertColorMutation.mutateAsync({ color_name, abbreviation: abbreviation.trim() })
              }
              if (selectedFile) handlePreview()
            }}
            onPreview={handlePreview}
            onBack={() => setStep('download')}
            onContinue={() => {
              if (previewResult!.missing_product_names.length > 0) {
                setPendingNameOverrides({})
                setShowNameDialog(true)
              } else {
                callImport()
              }
            }}
          />
        )}
        {step === 'resolve_conflicts' && addResult && (
          <SkuConflictResolver
            conflicts={addResult.sku_conflicts}
            resolutions={conflictResolutions}
            onResolutionChange={(rowKey, resolution) => setConflictResolutions((prev) => ({ ...prev, [rowKey]: resolution }))}
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
                onError: (err) => toast.error(err.message || 'Failed to resolve conflicts. Please try again.'),
              }
            )}
            isPending={resolveConflictsMutation.isPending}
          />
        )}
        {step === 'result' && (
          <ResultStep
            totalAdded={totalAdded}
            allSkipped={allSkipped}
            onDone={handleClose}
          />
        )}
        {showNameDialog && previewResult && (
          <MissingNamesDialog
            open={showNameDialog}
            missingProductNames={previewResult.missing_product_names}
            pendingNameOverrides={pendingNameOverrides}
            onNameChange={(row, value) => setPendingNameOverrides((prev) => ({ ...prev, [row]: value }))}
            onCancel={() => setShowNameDialog(false)}
            onConfirm={() => { setShowNameDialog(false); callImport() }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
