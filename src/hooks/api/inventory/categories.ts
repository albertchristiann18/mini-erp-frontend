import { useQuery } from '@tanstack/react-query'
import { createCrudHooks } from '../createCrudHooks'
import { getCategories, createCategory, updateCategory, deleteCategory, getMasterCategories } from '../../../api/inventory'
import type { Category, PaginatedResponse } from '../../../types/inventory'
import { categoryKeys, masterCategoryKeys } from '../../../lib/inventoryKeys'

/** staleTime for reference data (categories, warehouses, suppliers, etc.) — 10 min */
const STALE_REFERENCE = 1000 * 60 * 10

// ─── Categories — createCrudHooks (simple CRUD) ───────────────────────────────

const categoryHooks = createCrudHooks<Category, PaginatedResponse<Category>, unknown, unknown>({
  resource: 'categories',
  list: (params) => getCategories(params as Record<string, string | number> | undefined),
  create: (data) => createCategory(data),
  update: ({ id, data }) => updateCategory(id, data),
  remove: (id) => deleteCategory(id),
  keys: categoryKeys,
})

// Export individual hooks — staleTime override on useCategories
export const useCategories = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => getCategories(params),
    staleTime: STALE_REFERENCE,
  })
export const useCreateCategory = categoryHooks.useCreate
export const useUpdateCategory = categoryHooks.useUpdate
export const useDeleteCategory = categoryHooks.useDelete

// ─── Master Categories ────────────────────────────────────────────────────────

export const useMasterCategories = () =>
  useQuery({
    queryKey: masterCategoryKeys.all(),
    queryFn: () => getMasterCategories(),
    staleTime: Infinity,
  })
