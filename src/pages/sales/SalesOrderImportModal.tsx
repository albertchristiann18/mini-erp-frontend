import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { useWarehouses, useCompanyMarketplaces } from '../../hooks/api/useInventory'
import { usePreviewSalesOrderImport, useConfirmSalesOrderImport } from '../../hooks/sales/useSales'
import { useSalesOrderImport } from '../../hooks/sales/useSalesOrderImport'
import { toast } from '../../lib/toast'
import { SkuResolutionModal } from './SkuResolutionModal'
import { UploadStep, PreviewStep, ConfirmStep, ResultStep } from './SalesOrderImport'

interface SalesOrderImportModalProps {
  open: boolean
  onClose: () => void
  onImportSuccess: () => void
}

export function SalesOrderImportModal({ open, onClose, onImportSuccess }: SalesOrderImportModalProps) {
  const { data: warehousesData } = useWarehouses()
  const { data: marketplacesData } = useCompanyMarketplaces()
  const previewMutation = usePreviewSalesOrderImport()
  const confirmMutation = useConfirmSalesOrderImport()

  const warehouses = warehousesData?.results ?? []
  const marketplaces = marketplacesData?.results ?? []

  const state = useSalesOrderImport(onClose)
  const {
    step, file, marketplaceId, warehouseId,
    previewData, skuMappings, skipUnmatched, resultData, showSkuModal,
    unresolvedCount, hasNothingToDo, stockEligibleCount,
    setStep, setFile, setMarketplaceId, setWarehouseId,
    setPreviewData, setSkuMappings, setSkipUnmatched,
    setResultData, setShowSkuModal,
    handleFileChange, handleClose,
  } = state

  const dialogTitle = step === 'result' ? 'Import Complete' : 'Import Shopee Orders'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <UploadStep
            file={file}
            marketplaceId={marketplaceId}
            warehouseId={warehouseId}
            marketplaces={marketplaces}
            warehouses={warehouses}
            onFileChange={handleFileChange}
            onFileClear={() => setFile(null)}
            onMarketplaceChange={setMarketplaceId}
            onWarehouseChange={setWarehouseId}
          />
        )}

        {step === 'preview' && previewData && (
          <PreviewStep
            previewData={previewData}
            skuMappings={skuMappings}
            skipUnmatched={skipUnmatched}
            unresolvedCount={unresolvedCount}
            hasNothingToDo={hasNothingToDo}
            onOpenSkuModal={() => setShowSkuModal(true)}
            onSkipUnmatchedChange={setSkipUnmatched}
          />
        )}

        {step === 'confirm' && previewData && (
          <ConfirmStep
            previewData={previewData}
            skipUnmatched={skipUnmatched}
            stockEligibleCount={stockEligibleCount}
          />
        )}

        {step === 'result' && resultData && (
          <ResultStep resultData={resultData} />
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => {
                  previewMutation.mutate(
                    { file: file!, marketplaceId, warehouseId },
                    {
                      onSuccess: (data) => { setPreviewData(data); setStep('preview') },
                      onError: (err) => toast.error(err.message ?? 'Failed to parse file'),
                    }
                  )
                }}
                disabled={!file || !marketplaceId || !warehouseId || previewMutation.isPending}
              >
                {previewMutation.isPending ? 'Parsing...' : 'Preview File'}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={hasNothingToDo || (unresolvedCount > 0 && !skipUnmatched)}
              >
                Proceed to Import
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')} disabled={confirmMutation.isPending}>
                Back
              </Button>
              <Button
                onClick={() => {
                  confirmMutation.mutate(
                    { file: file!, marketplaceId, warehouseId, skuMappings, skipUnmatched },
                    {
                      onSuccess: (data) => { setResultData(data); setStep('result') },
                      onError: (err) => toast.error(err.message ?? 'Import failed'),
                    }
                  )
                }}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? 'Importing...' : 'Confirm Import'}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={() => { onImportSuccess(); handleClose() }}>
              Close
            </Button>
          )}
        </DialogFooter>

        <SkuResolutionModal
          open={showSkuModal}
          onClose={() => setShowSkuModal(false)}
          unmatchedSkus={previewData?.unmatched_skus ?? []}
          onConfirm={(mappings) => { setSkuMappings(mappings); setShowSkuModal(false) }}
        />
      </DialogContent>
    </Dialog>
  )
}
