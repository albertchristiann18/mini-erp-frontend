import { useQuery } from '@tanstack/react-query'
import { createCrudHooks } from '../createCrudHooks'
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../../api/inventory'
import type { Warehouse, PaginatedResponse } from '../../../types/inventory'
import { useAuth } from '../../../contexts/AuthContext'
import { warehouseKeys } from '../../../lib/inventoryKeys'

/** staleTime for reference data (categories, warehouses, suppliers, etc.) — 10 min */
const STALE_REFERENCE = 1000 * 60 * 10

// ─── Warehouses — createCrudHooks (simple CRUD) ───────────────────────────────

const warehouseHooks = createCrudHooks<Warehouse, PaginatedResponse<Warehouse>, unknown, unknown>({
  resource: 'warehouses',
  list: (params) => getWarehouses(params as Record<string, string | number> | undefined),
  create: (data) => createWarehouse(data),
  update: ({ id, data }) => updateWarehouse(id, data),
  remove: (id) => deleteWarehouse(id),
  keys: warehouseKeys,
})

// staleTime override on useWarehouses — also needs auth company_id in key for cache isolation
export function useWarehouses(page = 1, pageSize = 100) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...warehouseKeys.list({ page, page_size: pageSize }), user?.company_id ?? null],
    queryFn: () => getWarehouses({ page, page_size: pageSize }),
    staleTime: STALE_REFERENCE,
  })
}
export const useCreateWarehouse = warehouseHooks.useCreate
export const useUpdateWarehouse = warehouseHooks.useUpdate
