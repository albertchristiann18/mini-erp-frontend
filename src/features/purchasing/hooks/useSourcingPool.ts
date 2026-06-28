import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSourcingPoolItems,
  downloadSourcingPoolTemplate,
  previewSourcingPoolUpload,
  importSourcingPoolRows,
  addDraftLine,
  finalizeDraftLine,
} from '../../../api/purchasing'
import type { SourcingPoolItem, SourcingPoolPreviewRow } from '../../../types/purchasing'

export const useSourcingPoolItems = (supplierId: string | undefined) => {
  return useQuery({
    queryKey: ['sourcing-pool-items', supplierId],
    queryFn: async () => {
      const resp = await getSourcingPoolItems(supplierId!)
      const items: SourcingPoolItem[] = resp.data.results ?? resp.data.items ?? []
      return { pool_id: resp.data.pool_id, items }
    },
    enabled: !!supplierId && supplierId !== 'none' && supplierId !== '',
    staleTime: 30_000,
  })
}

export const useDownloadSourcingPoolTemplate = () =>
  useMutation({
    mutationFn: async () => {
      const response = await downloadSourcingPoolTemplate()
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'sourcing_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
  })

export const usePreviewSourcingPool = () =>
  useMutation({
    mutationFn: (file: File) => previewSourcingPoolUpload(file).then((r) => r.data),
  })

export const useImportSourcingPool = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      supplierId,
      rows,
    }: {
      supplierId: string
      rows: SourcingPoolPreviewRow[]
    }) => importSourcingPoolRows(supplierId, rows).then((r) => r.data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['sourcing-pool-items', variables.supplierId] })
    },
  })
}

export const useAddDraftLine = () =>
  useMutation({
    mutationFn: ({
      poId,
      sourcing_item_id,
      ordered_qty,
      unit_price_foreign,
    }: {
      poId: string
      sourcing_item_id: string
      ordered_qty: number
      unit_price_foreign?: number
    }) =>
      addDraftLine(poId, { sourcing_item_id, ordered_qty, unit_price_foreign }).then((r) => r.data),
  })

export const useFinalizeDraftLine = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      poId,
      detailId,
      sku_suffix,
      category_id,
      product_name,
    }: {
      poId: string
      detailId: string
      sku_suffix: string
      category_id?: string | null
      product_name?: string
    }) =>
      finalizeDraftLine(poId, detailId, { sku_suffix, category_id, product_name }).then(
        (r) => r.data,
      ),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', variables.poId] })
    },
  })
}
