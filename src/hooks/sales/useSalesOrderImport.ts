import { useState } from 'react'
import type { ExcelImportPreviewResponse, ExcelImportConfirmResponse, ExcelImportSkuMapping } from '../../types/sales'

export type ImportStep = 'upload' | 'preview' | 'confirm' | 'result'

export interface SalesOrderImportState {
  step: ImportStep
  file: File | null
  marketplaceId: string
  warehouseId: string
  previewData: ExcelImportPreviewResponse | null
  skuMappings: ExcelImportSkuMapping[]
  skipUnmatched: boolean
  resultData: ExcelImportConfirmResponse | null
  showSkuModal: boolean
  // derived
  unresolvedCount: number
  hasNothingToDo: boolean
  stockEligibleCount: number
}

export interface SalesOrderImportActions {
  setStep: (step: ImportStep) => void
  setFile: (file: File | null) => void
  setMarketplaceId: (id: string) => void
  setWarehouseId: (id: string) => void
  setPreviewData: (data: ExcelImportPreviewResponse) => void
  setSkuMappings: (mappings: ExcelImportSkuMapping[]) => void
  setSkipUnmatched: (skip: boolean) => void
  setResultData: (data: ExcelImportConfirmResponse) => void
  setShowSkuModal: (show: boolean) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleClose: () => void
}

export function useSalesOrderImport(onClose: () => void): SalesOrderImportState & SalesOrderImportActions {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [marketplaceId, setMarketplaceId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [previewData, setPreviewData] = useState<ExcelImportPreviewResponse | null>(null)
  const [skuMappings, setSkuMappings] = useState<ExcelImportSkuMapping[]>([])
  const [skipUnmatched, setSkipUnmatched] = useState(false)
  const [resultData, setResultData] = useState<ExcelImportConfirmResponse | null>(null)
  const [showSkuModal, setShowSkuModal] = useState(false)

  const unresolvedCount = previewData
    ? previewData.unmatched_skus.filter(u => !skuMappings.some(m => m.shopee_sku === u.shopee_sku)).length
    : 0

  const hasNothingToDo = !!previewData
    && previewData.new_orders.length === 0
    && previewData.status_updates.length === 0
    && previewData.cancellation_transitions.length === 0

  const stockEligibleCount = previewData?.new_orders.filter(o =>
    ['CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(o.mapped_status)
  ).length ?? 0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setMarketplaceId('')
    setWarehouseId('')
    setPreviewData(null)
    setSkuMappings([])
    setSkipUnmatched(false)
    setResultData(null)
    setShowSkuModal(false)
    onClose()
  }

  return {
    step,
    file,
    marketplaceId,
    warehouseId,
    previewData,
    skuMappings,
    skipUnmatched,
    resultData,
    showSkuModal,
    unresolvedCount,
    hasNothingToDo,
    stockEligibleCount,
    setStep,
    setFile,
    setMarketplaceId,
    setWarehouseId,
    setPreviewData: (data) => setPreviewData(data),
    setSkuMappings,
    setSkipUnmatched,
    setResultData: (data) => setResultData(data),
    setShowSkuModal,
    handleFileChange,
    handleClose,
  }
}
