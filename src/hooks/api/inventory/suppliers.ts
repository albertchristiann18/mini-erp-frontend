import { useQuery } from '@tanstack/react-query'
import { createCrudHooks } from '../createCrudHooks'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../../api/inventory'
import type { Supplier, PaginatedResponse } from '../../../types/inventory'
import { supplierKeys } from '../../../lib/inventoryKeys'

/** staleTime for reference data (categories, warehouses, suppliers, etc.) — 10 min */
const STALE_REFERENCE = 1000 * 60 * 10

// ─── Suppliers — createCrudHooks ──────────────────────────────────────────────

const supplierHooks = createCrudHooks<Supplier, PaginatedResponse<Supplier>, unknown, unknown>({
  resource: 'suppliers',
  list: (params) => getSuppliers(params as Record<string, string | number> | undefined),
  create: (data) => createSupplier(data),
  update: ({ id, data }) => updateSupplier(id, data),
  remove: (id) => deleteSupplier(id),
  keys: supplierKeys,
})

// staleTime override on useSuppliers (reference tier)
export const useSuppliers = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => getSuppliers(params),
    staleTime: STALE_REFERENCE,
  })
export const useCreateSupplier = supplierHooks.useCreate
export const useUpdateSupplier = supplierHooks.useUpdate
export const useDeleteSupplier = supplierHooks.useDelete
