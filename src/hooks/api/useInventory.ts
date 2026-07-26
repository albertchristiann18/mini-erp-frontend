import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '../../lib/errors'
import { createCrudHooks } from './createCrudHooks'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct,
  getProductVariants, getProductVariantStocks, getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getStockMovements, getMasterCategories,
  bulkCreateProducts, bulkUpdateInventory, adjustStock, getAvgSales, getInventorySummary, updateVariantPrice,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getProductSuppliers, createProductSupplier, deleteProductSupplier, updateProductSupplier,
  saveVariants, uploadVariantPhoto, deleteVariantPhoto, uploadDimensionImage, deleteDimensionImage,
  uploadProductPhoto, deleteProductPhoto, reorderProductPhotos,
  getCompanyMarketplaces, createCompanyMarketplace, updateCompanyMarketplace, deleteCompanyMarketplace,
  getBusinessEntities, createBusinessEntity, updateBusinessEntity, deleteBusinessEntity,
  getProductBusinessEntities, attachBusinessEntity, detachBusinessEntity,
} from '../../api/inventory'
import type { SaveVariantsPayload, BulkUpdateResult, BulkCreateResult } from '../../api/inventory'
import { http } from '../../lib/http'
import { useAuth } from '../../contexts/AuthContext'
import type { Product, Supplier, BusinessEntity, Category, Warehouse, PaginatedResponse, InventorySummaryResponse } from '../../types/inventory'
import {
  categoryKeys, warehouseKeys, supplierKeys, masterCategoryKeys, companyMarketplaceKeys,
  businessEntityKeys, productKeys, productVariantKeys, stockMovementKeys, inventorySummaryKeys,
  avgSalesKeys, productVariantStockKeys, variantSearchKeys, productSupplierKeys, productBusinessEntityKeys,
} from '../../lib/inventoryKeys'

// ─── Reference-data tiers (5–10 min staleTime) ────────────────────────────────

/** staleTime for reference data (categories, warehouses, suppliers, etc.) — 10 min */
const STALE_REFERENCE = 1000 * 60 * 10
/** staleTime for slowly-changing reference data (company marketplaces) — 5 min */
const STALE_REFERENCE_SLOW = 1000 * 60 * 5
/** staleTime for volatile data (stock, movements, summaries) — 0 */
const STALE_VOLATILE = 0

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

// ─── Products ─────────────────────────────────────────────────────────────────

export const useProducts = (page = 1, pageSize = 20, search?: string, category?: string, ordering?: string) => {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (search) params.search = search
  if (category) params.category = category
  if (ordering) params.ordering = ordering
  return useQuery({
    queryKey: productKeys.list({ page, pageSize, search, category, ordering }),
    queryFn: () => getProducts(params),
  })
}

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all() })
      qc.invalidateQueries({ queryKey: variantSearchKeys.all() })
    },
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all() }),
  })
}

export const useProduct = (id: string) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => http.get<Product>(`/product/${id}/`),
    enabled: !!id,
  })

// ─── Product Variants ─────────────────────────────────────────────────────────

export const useProductVariants = (page = 1, pageSize = 100) =>
  useQuery({
    queryKey: productVariantKeys.list({ page, pageSize }),
    queryFn: () => getProductVariants({ page, page_size: pageSize }),
  })

export const useVariantSearch = (
  params: { search?: string; page_size?: number; supplier_id?: string },
  enabled = true,
) =>
  useQuery({
    queryKey: variantSearchKeys.list(params),
    queryFn: () => getProductVariantStocks({ ...params }),
    enabled,
  })

export const useAllVariants = () =>
  useQuery({
    queryKey: productVariantKeys.list({ page_size: 500, is_active: 'true' }),
    queryFn: () => getProductVariants({ page_size: 500, is_active: 'true' }),
  })

// ─── Product Variant Stocks ───────────────────────────────────────────────────

export const useProductVariantStocks = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: productVariantStockKeys.list(params),
    queryFn: () => getProductVariantStocks(params),
    staleTime: STALE_VOLATILE,
  })

/**
 * Imperative variant-stock search hook.
 * Used by pages (BulkStockUpdatePage) that search on user action rather than on mount.
 * Returns a `search` function that resolves with paginated results.
 */
export const useSearchVariantStocks = () =>
  useMutation({
    mutationFn: (params: Record<string, string | number>) => getProductVariantStocks(params),
  })

// ─── Stock Movements ──────────────────────────────────────────────────────────

export const useStockMovements = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: stockMovementKeys.list(params),
    queryFn: () => getStockMovements(params),
    staleTime: STALE_VOLATILE,
  })

export const useStockClosingReport = (month: string, warehouseId: string) => {
  const [year, mon] = month.split('-')
  const monthStart = `${year}-${mon}-01`
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
  const monthEnd = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: stockMovementKeys.list({ month, warehouseId }),
    queryFn: () => {
      const params: Record<string, string | number> = {
        page_size: 1000,
        cdate_after: monthStart,
        cdate_before: monthEnd,
      }
      if (warehouseId) params.warehouse = warehouseId
      return getStockMovements(params)
    },
    enabled: !!month,
    staleTime: STALE_VOLATILE,
  })
}

// ─── Master Categories ────────────────────────────────────────────────────────

export const useMasterCategories = () =>
  useQuery({
    queryKey: masterCategoryKeys.all(),
    queryFn: () => getMasterCategories(),
    staleTime: Infinity,
  })

// ─── Bulk Ops ─────────────────────────────────────────────────────────────────

export const useBulkCreateProducts = () => {
  const qc = useQueryClient()
  return useMutation<BulkCreateResult, unknown, unknown[]>({
    mutationFn: (data) => bulkCreateProducts(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all() }),
  })
}

export const useBulkUpdateInventory = () => {
  const qc = useQueryClient()
  return useMutation<BulkUpdateResult, unknown, Parameters<typeof bulkUpdateInventory>[0]>({
    mutationFn: (updates) => bulkUpdateInventory(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: stockMovementKeys.all() }),
  })
}

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof adjustStock>[0]) => adjustStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productVariantStockKeys.all() })
      qc.invalidateQueries({ queryKey: warehouseKeys.all() })
    },
  })
}

// ─── Inventory Summary & Avg Sales ────────────────────────────────────────────

export const useInventorySummary = () =>
  useQuery<InventorySummaryResponse, ApiError>({
    queryKey: inventorySummaryKeys.all(),
    queryFn: () => getInventorySummary(),
    staleTime: STALE_VOLATILE,
  })

export const useAvgSales = (variantIds: string[], days: number) =>
  useQuery({
    queryKey: avgSalesKeys.list({ variantIds, days }),
    queryFn: () => getAvgSales(variantIds, days),
    enabled: variantIds.length > 0,
    staleTime: STALE_VOLATILE,
  })

// ─── Variant Price ────────────────────────────────────────────────────────────

export const useUpdateVariantPrice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, variantId, basePrice }: { productId: string; variantId: string; basePrice: number }) =>
      updateVariantPrice(productId, variantId, basePrice),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(variables.productId) })
      qc.invalidateQueries({ queryKey: productKeys.all() })
      qc.invalidateQueries({ queryKey: inventorySummaryKeys.all() })
    },
  })
}

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

// ─── Product Suppliers ────────────────────────────────────────────────────────

export const useProductSuppliers = (productId: string) =>
  useQuery({
    queryKey: productSupplierKeys.list({ productId }),
    queryFn: () => getProductSuppliers({ product_id: productId }),
    enabled: !!productId,
  })

export const useCreateProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { supplier_id: string; supplier_link?: string | null }) =>
      createProductSupplier({ product_id: productId, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productSupplierKeys.list({ productId }) }),
  })
}

export const useDeleteProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productSupplierKeys.list({ productId }) }),
  })
}

export const useUpdateProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, supplier_link }: { id: string; supplier_link: string | null }) =>
      updateProductSupplier(id, { supplier_link }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productSupplierKeys.list({ productId }) }),
  })
}

// ─── Company Marketplaces — createCrudHooks ───────────────────────────────────

const companyMarketplaceHooks = createCrudHooks<
  import('../../types/inventory').CompanyMarketplace,
  PaginatedResponse<import('../../types/inventory').CompanyMarketplace>,
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
  useQuery<PaginatedResponse<import('../../types/inventory').CompanyMarketplace>, ApiError>({
    queryKey: companyMarketplaceKeys.list(params),
    queryFn: () => getCompanyMarketplaces({ page_size: 100, ...params }),
    staleTime: STALE_REFERENCE_SLOW,
  })
export const useCreateCompanyMarketplace = companyMarketplaceHooks.useCreate
export const useUpdateCompanyMarketplace = companyMarketplaceHooks.useUpdate
export const useDeleteCompanyMarketplace = companyMarketplaceHooks.useDelete

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

// ─── Save Variants ────────────────────────────────────────────────────────────

/**
 * Per-call variant: productId is passed per-mutation-call.
 * Used by pages (ProductEditPage) that need to save variants for a newly-created product
 * whose id is not known at hook-construction time.
 */
export const useSaveAnyVariants = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: SaveVariantsPayload }) =>
      saveVariants(productId, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(variables.productId) })
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}

export const useSaveVariants = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveVariantsPayload) => saveVariants(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId) })
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}

// ─── Photo hooks ──────────────────────────────────────────────────────────────

export const useUploadVariantPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ variantId, image }: { variantId: string; image: File }) =>
      uploadVariantPhoto(productId, variantId, image),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

/**
 * Variant of useUploadVariantPhoto where productId is provided per-call,
 * for pages that upload photos across many products (e.g. PO detail item rows).
 */
export const useUploadAnyVariantPhoto = () =>
  useMutation({
    mutationFn: ({ productId, variantId, image }: { productId: string; variantId: string; image: File }) =>
      uploadVariantPhoto(productId, variantId, image),
  })

export const useDeleteVariantPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variantId: string) => deleteVariantPhoto(productId, variantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useUploadDimensionImage = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dimKey, dimValue, photo }: { dimKey: string; dimValue: string; photo: File }) =>
      uploadDimensionImage(productId, dimKey, dimValue, photo),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useDeleteDimensionImage = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dimKey, dimValue }: { dimKey: string; dimValue: string }) =>
      deleteDimensionImage(productId, dimKey, dimValue),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

// ─── Photo upload hooks (product-level) ───────────────────────────────────────

export const useUploadProductPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (image: File) => uploadProductPhoto(productId, image),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useUploadAnyProductPhoto = () =>
  useMutation({
    mutationFn: ({ productId, image }: { productId: string; image: File }) =>
      uploadProductPhoto(productId, image),
  })

export const useDeleteProductPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: string) => deleteProductPhoto(productId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useReorderProductPhotos = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoIds: string[]) => reorderProductPhotos(productId, photoIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}
