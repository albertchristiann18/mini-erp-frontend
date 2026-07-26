import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '../../lib/errors'
import { previewSalesOrderExcelImport, confirmSalesOrderExcelImport } from '../../api/sales'
import type { ExcelImportPreviewResponse, ExcelImportConfirmResponse } from '../../types/sales'
import { salesOrderKeys } from '../../lib/salesKeys'

export const usePreviewSalesOrderImport = () => {
  return useMutation<ExcelImportPreviewResponse, ApiError, { file: File; marketplaceId: string; warehouseId: string }>({
    mutationFn: ({ file, marketplaceId, warehouseId }) =>
      previewSalesOrderExcelImport(file, marketplaceId, warehouseId),
  })
}

export const useConfirmSalesOrderImport = () => {
  const qc = useQueryClient()
  return useMutation<ExcelImportConfirmResponse, ApiError, {
    file: File; marketplaceId: string; warehouseId: string
    skuMappings: { shopee_sku: string; variant_id: string }[]
    skipUnmatched: boolean
  }>({
    mutationFn: ({
      file, marketplaceId, warehouseId, skuMappings, skipUnmatched,
    }) => confirmSalesOrderExcelImport(file, marketplaceId, warehouseId, skuMappings, skipUnmatched),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
  })
}
