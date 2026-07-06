import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSourcingPoolItems,
  downloadSourcingPoolTemplate,
  previewSourcingPoolUpload,
  importSourcingPoolRows,
  getColorAbbreviations,
  upsertColorAbbreviation,
  deleteColorAbbreviation,
  addPoolItemsToPo,
  resolveSkuConflicts,
} from '../../../api/purchasing'
import type { SourcingPoolItem, SourcingPoolPreviewRow, AddPoolItemsRequest, ResolveSkuConflictsRequest } from '../../../types/purchasing'

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

export const useColorAbbreviations = () =>
  useQuery({
    queryKey: ['color-abbreviations'],
    queryFn: () => getColorAbbreviations().then((r) => r.data),
    staleTime: 60_000,
  })

export const useUpsertColorAbbreviation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { color_name: string; abbreviation: string }) =>
      upsertColorAbbreviation(data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['color-abbreviations'] })
    },
  })
}

export const useDeleteColorAbbreviation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (color_name: string) => deleteColorAbbreviation(color_name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['color-abbreviations'] })
    },
  })
}

export const useAddPoolItemsToPo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: AddPoolItemsRequest }) =>
      addPoolItemsToPo(poId, data).then((r) => r.data),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', variables.poId] })
      void qc.invalidateQueries({ queryKey: ['sourcing-pool-items'] })
    },
  })
}

export const useResolveSkuConflicts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: ResolveSkuConflictsRequest }) =>
      resolveSkuConflicts(poId, data).then((r) => r.data),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', variables.poId] })
      void qc.invalidateQueries({ queryKey: ['sourcing-pool-items'] })
    },
  })
}
