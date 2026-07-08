import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'

export interface CrudHooksConfig<TItem, TList, TCreateInput, TUpdateInput, TListParams = Record<string, string | number> | undefined> {
  resource: string
  list: (params: TListParams) => Promise<TList>
  create: (data: TCreateInput) => Promise<TItem>
  update: (args: { id: string; data: TUpdateInput }) => Promise<TItem>
  remove: (id: string) => Promise<unknown>
}

export function createCrudHooks<TItem, TList, TCreateInput, TUpdateInput, TListParams = Record<string, string | number> | undefined>(
  config: CrudHooksConfig<TItem, TList, TCreateInput, TUpdateInput, TListParams>,
) {
  const useList = (params?: TListParams): UseQueryResult<TList> =>
    useQuery({
      queryKey: [config.resource, params],
      queryFn: () => config.list(params as TListParams),
    })

  const useCreate = (): UseMutationResult<TItem, unknown, TCreateInput> => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: config.create,
      // Block body, no return — invalidateQueries() must stay fire-and-forget, not awaited.
      // Returning the promise makes TanStack Query await it before the call-level onSuccess
      // fires, which would delay UI feedback until the background refetch completes.
      onSuccess: () => { qc.invalidateQueries({ queryKey: [config.resource] }) },
    })
  }

  const useUpdate = (): UseMutationResult<TItem, unknown, { id: string; data: TUpdateInput }> => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: config.update,
      onSuccess: () => { qc.invalidateQueries({ queryKey: [config.resource] }) },
    })
  }

  const useDelete = (): UseMutationResult<unknown, unknown, string> => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: config.remove,
      onSuccess: () => { qc.invalidateQueries({ queryKey: [config.resource] }) },
    })
  }

  return { useList, useCreate, useUpdate, useDelete }
}
