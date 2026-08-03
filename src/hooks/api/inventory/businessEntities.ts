import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks } from '../createCrudHooks'
import {
  getBusinessEntities, createBusinessEntity, updateBusinessEntity, deleteBusinessEntity,
  getProductBusinessEntities, attachBusinessEntity, detachBusinessEntity,
} from '../../../api/inventory'
import type { BusinessEntity, PaginatedResponse } from '../../../types/inventory'
import { businessEntityKeys, productBusinessEntityKeys } from '../../../lib/inventoryKeys'

// ─── Business Entities — createCrudHooks ─────────────────────────────────────

const businessEntityHooks = createCrudHooks<
  BusinessEntity, PaginatedResponse<BusinessEntity>,
  { name: string; marketplace_id: string; is_active?: boolean },
  Partial<{ name: string; marketplace_id: string; is_active: boolean }>
>({
  resource: 'business-entities',
  list: (params) => getBusinessEntities(params as Record<string, string | number> | undefined),
  create: (data) => createBusinessEntity(data),
  update: ({ id, data }) => updateBusinessEntity(id, data),
  remove: (id) => deleteBusinessEntity(id),
  keys: businessEntityKeys,
})
export const useBusinessEntities = businessEntityHooks.useList
export const useCreateBusinessEntity = businessEntityHooks.useCreate
export const useUpdateBusinessEntity = businessEntityHooks.useUpdate
export const useDeleteBusinessEntity = businessEntityHooks.useDelete

// ─── Product Business Entities ────────────────────────────────────────────────

export const useProductBusinessEntities = (productId: string) =>
  useQuery({
    queryKey: productBusinessEntityKeys.list({ productId }),
    queryFn: () => getProductBusinessEntities({ product_id: productId }),
    enabled: !!productId,
  })

export const useAttachBusinessEntity = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (businessEntityId: string) =>
      attachBusinessEntity({ product_id: productId, business_entity_id: businessEntityId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productBusinessEntityKeys.list({ productId }) }),
  })
}

export const useDetachBusinessEntity = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => detachBusinessEntity(assignmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: productBusinessEntityKeys.list({ productId }) }),
  })
}
