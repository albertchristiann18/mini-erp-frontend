import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '../../../lib/errors'
import { createCrudHooks } from '../createCrudHooks'
import { getCompanyMarketplaces, createCompanyMarketplace, updateCompanyMarketplace, deleteCompanyMarketplace } from '../../../api/inventory'
import type { CompanyMarketplace, PaginatedResponse } from '../../../types/inventory'
import { companyMarketplaceKeys } from '../../../lib/inventoryKeys'

/** staleTime for slowly-changing reference data (company marketplaces) — 5 min */
const STALE_REFERENCE_SLOW = 1000 * 60 * 5

// ─── Company Marketplaces — createCrudHooks ───────────────────────────────────

const companyMarketplaceHooks = createCrudHooks<
  CompanyMarketplace,
  PaginatedResponse<CompanyMarketplace>,
  { name: string; is_active?: boolean },
  Partial<{ name: string; is_active: boolean }>
>({
  resource: 'company-marketplaces',
  list: (params) => getCompanyMarketplaces(params as Record<string, string | number> | undefined),
  create: (data) => createCompanyMarketplace(data),
  update: ({ id, data }) => updateCompanyMarketplace(id, data),
  remove: (id) => deleteCompanyMarketplace(id),
  keys: companyMarketplaceKeys,
})

// staleTime override on useCompanyMarketplaces (reference tier, 5 min)
export const useCompanyMarketplaces = (params?: Record<string, string | number>) =>
  useQuery<PaginatedResponse<CompanyMarketplace>, ApiError>({
    queryKey: companyMarketplaceKeys.list(params),
    queryFn: () => getCompanyMarketplaces({ page_size: 100, ...params }),
    staleTime: STALE_REFERENCE_SLOW,
  })
export const useCreateCompanyMarketplace = companyMarketplaceHooks.useCreate
export const useUpdateCompanyMarketplace = companyMarketplaceHooks.useUpdate
export const useDeleteCompanyMarketplace = companyMarketplaceHooks.useDelete
