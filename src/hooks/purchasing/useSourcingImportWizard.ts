import { useState, useEffect } from 'react'
import { toast } from '../../lib/toast'
import {
  useDownloadSourcingPoolTemplate,
  usePreviewSourcingPool,
  useImportAndAdd,
  useUpsertColorAbbreviation,
  useResolveSourcingConflicts,
} from './useSourcingPool'
import type {
  SourcingPoolPreviewResult,
  ImportAndAddResult,
  ResolveSourcingConflictsResult,
} from '../../types/purchasing'

export type WizardStep = 'download' | 'upload' | 'resolve_conflicts' | 'result'

/** Mirrors ConflictResolution from SkuConflictResolver — kept here to avoid a shared→domain import */
export interface ConflictResolution {
  action: 'add_to_existing' | 'skip'
  product_id?: string
}

export const stepLabel = (step: WizardStep): string => {
  switch (step) {
    case 'download': return 'Step 1 of 4: Download Template'
    case 'upload': return 'Step 2 of 4: Upload and Preview'
    case 'resolve_conflicts': return 'SKU Conflicts'
    case 'result': return 'Done'
  }
}

interface UseSourcingImportWizardProps {
  poId: string
  supplierId: string
  onClose: () => void
}

export interface UseSourcingImportWizardResult {
  step: WizardStep
  setStep: (step: WizardStep) => void
  selectedFile: File | null
  setSelectedFile: (file: File | null) => void
  previewResult: SourcingPoolPreviewResult | null
  setPreviewResult: (result: SourcingPoolPreviewResult | null) => void
  dimMismatchResolutions: Record<string, 'variant_code' | 'dims'>
  setDimMismatchResolutions: React.Dispatch<React.SetStateAction<Record<string, 'variant_code' | 'dims'>>>
  missingColorForms: Record<string, string>
  setMissingColorForms: React.Dispatch<React.SetStateAction<Record<string, string>>>
  showNameDialog: boolean
  setShowNameDialog: (show: boolean) => void
  pendingNameOverrides: Record<string, string>
  setPendingNameOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>
  addResult: ImportAndAddResult | null
  setAddResult: (result: ImportAndAddResult | null) => void
  resolveResult: ResolveSourcingConflictsResult | null
  setResolveResult: (result: ResolveSourcingConflictsResult | null) => void
  conflictResolutions: Record<string, ConflictResolution>
  setConflictResolutions: React.Dispatch<React.SetStateAction<Record<string, ConflictResolution>>>
  downloadMutation: ReturnType<typeof useDownloadSourcingPoolTemplate>
  previewMutation: ReturnType<typeof usePreviewSourcingPool>
  upsertColorMutation: ReturnType<typeof useUpsertColorAbbreviation>
  importAndAddMutation: ReturnType<typeof useImportAndAdd>
  resolveConflictsMutation: ReturnType<typeof useResolveSourcingConflicts>
  handleClose: () => void
  handlePreview: () => void
  callImport: () => void
  totalAdded: number
  allSkipped: ResolveSourcingConflictsResult['skipped']
}

export function useSourcingImportWizard({
  poId,
  supplierId,
  onClose,
}: UseSourcingImportWizardProps): UseSourcingImportWizardResult {
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
      onError: (err) => toast.error(err.message || 'Failed to parse file. Make sure you used the template.'),
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
        onError: (err) => toast.error(err.message || 'Import failed. Please try again.'),
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

  return {
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
    setAddResult,
    resolveResult,
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
  }
}
