import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { createQueryKeys, type QueryKeyFactory } from '../../lib/queryKeys'

export interface CrudHooksConfig<TItem, TList, TCreateInput, TUpdateInput, TListParams = Record<string, string | number> | undefined> {
  resource: string
  list: (params: TListParams) => Promise<TList>
  create: (data: TCreateInput) => Promise<TItem>
  update: (args: { id: string; data: TUpdateInput }) => Promise<TItem>
  remove: (id: string) => Promise<unknown>
  /**
   * Optional pre-built key factory for this resource.
   * If omitted, one is created automatically from `resource`.
   * Provide your own when you need custom filter typing:
   *   keys: createQueryKeys<MyFilters>('categories')
   */
  keys?: QueryKeyFactory
}

export function createCrudHooks<TItem, TList, TCreateInput, TUpdateInput, TListParams = Record<string, string | number> | undefined>(
  config: CrudHooksConfig<TItem, TList, TCreateInput, TUpdateInput, TListParams>,
) {
  // Use the provided key factory or generate one from the resource string.
  // The factory is the single source of truth for query-key shape — hooks and
  // invalidation both derive their keys from here.
  const keys: QueryKeyFactory = config.keys ?? createQueryKeys(config.resource)

  const useList = (params?: TListParams): UseQueryResult<TList> =>
    useQuery({
      queryKey: keys.list(params as Record<string, unknown> | undefined),
      queryFn: () => config.list(params as TListParams),
    })

  const useCreate = (): UseMutationResult<TItem, unknown, TCreateInput> => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: config.create,
      // Block body, no return — invalidateQueries() must stay fire-and-forget, not awaited.
      // Returning the promise makes TanStack Query await it before the call-level onSuccess
      // fires, which would delay UI feedback until the background refetch completes.
      onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all() }) },
    })
  }

  const useUpdate = (): UseMutationResult<TItem, unknown, { id: string; data: TUpdateInput }> => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: config.update,
      onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all() }) },
    })
  }

  const useDelete = (): UseMutationResult<unknown, unknown, string> => {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: config.remove,
      onSuccess: () => { qc.invalidateQueries({ queryKey: keys.all() }) },
    })
  }

  return { useList, useCreate, useUpdate, useDelete, keys }
}
