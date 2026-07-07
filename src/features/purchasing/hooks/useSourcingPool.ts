import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  downloadSourcingPoolTemplate,
  previewSourcingPoolUpload,
  getColorAbbreviations,
  upsertColorAbbreviation,
  deleteColorAbbreviation,
  importAndAdd,
  resolveSourcingConflicts,
} from '../../../api/purchasing'
import type { ImportAndAddRequest, ResolveSourcingConflictsRequest } from '../../../types/purchasing'

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

export const useImportAndAdd = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: ImportAndAddRequest }) =>
      importAndAdd(poId, data).then((r) => r.data),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', variables.poId] })
    },
  })
}

export const useResolveSourcingConflicts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: ResolveSourcingConflictsRequest }) =>
      resolveSourcingConflicts(poId, data).then((r) => r.data),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: ['purchase-order', variables.poId] })
    },
  })
}
