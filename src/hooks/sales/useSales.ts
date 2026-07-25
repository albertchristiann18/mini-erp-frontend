import { useMutation, useQueryClient } from '@tanstack/react-query'
import { previewSalesOrderExcelImport, confirmSalesOrderExcelImport } from '../../api/sales'
import { salesOrderKeys } from '../../lib/salesKeys'

export const usePreviewSalesOrderImport = () => {
  return useMutation({
    mutationFn: ({ file, marketplaceId, warehouseId }: { file: File; marketplaceId: string; warehouseId: string }) =>
      previewSalesOrderExcelImport(file, marketplaceId, warehouseId),
  })
}

export const useConfirmSalesOrderImport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file, marketplaceId, warehouseId, skuMappings, skipUnmatched,
    }: {
      file: File; marketplaceId: string; warehouseId: string
      skuMappings: { shopee_sku: string; variant_id: string }[]
      skipUnmatched: boolean
    }) => confirmSalesOrderExcelImport(file, marketplaceId, warehouseId, skuMappings, skipUnmatched),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
  })
}
