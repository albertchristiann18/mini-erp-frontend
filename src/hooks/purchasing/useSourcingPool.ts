import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  downloadSourcingPoolTemplate,
  previewSourcingPoolUpload,
  getColorAbbreviations,
  upsertColorAbbreviation,
  deleteColorAbbreviation,
  importAndAdd,
  resolveSourcingConflicts,
} from '../../api/purchasing'
import { colorAbbreviationKeys, purchaseOrderKeys } from '../../lib/purchasingKeys'
import type { ImportAndAddRequest, ResolveSourcingConflictsRequest } from '../../types/purchasing'

export const useDownloadSourcingPoolTemplate = () =>
  useMutation({
    mutationFn: async () => {
      const blob = await downloadSourcingPoolTemplate()
      const url = window.URL.createObjectURL(blob)
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
    mutationFn: (file: File) => previewSourcingPoolUpload(file),
  })

export const useColorAbbreviations = () =>
  useQuery({
    queryKey: colorAbbreviationKeys.all(),
    queryFn: () => getColorAbbreviations(),
    staleTime: 60_000,
  })

export const useUpsertColorAbbreviation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { color_name: string; abbreviation: string }) =>
      upsertColorAbbreviation(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: colorAbbreviationKeys.all() })
    },
  })
}

export const useDeleteColorAbbreviation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (color_name: string) => deleteColorAbbreviation(color_name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: colorAbbreviationKeys.all() })
    },
  })
}

export const useImportAndAdd = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: ImportAndAddRequest }) =>
      importAndAdd(poId, data),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(variables.poId) })
    },
  })
}

export const useResolveSourcingConflicts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: ResolveSourcingConflictsRequest }) =>
      resolveSourcingConflicts(poId, data),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(variables.poId) })
    },
  })
}
