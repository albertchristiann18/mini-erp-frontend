import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks } from './createCrudHooks'
import {
  getCategories, createCategory, updateCategory, getProducts, createProduct, updateProduct,
  getProductVariants, getProductVariantStocks, getWarehouses, createWarehouse, updateWarehouse,
  getStockMovements, getMasterCategories,
  bulkCreateProducts, bulkUpdateInventory, adjustStock, getAvgSales, getInventorySummary, updateVariantPrice,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getProductSuppliers, createProductSupplier, deleteProductSupplier, updateProductSupplier,
  saveVariants, deleteCategory,   uploadVariantPhoto, deleteVariantPhoto, uploadDimensionImage, deleteDimensionImage,
  getCompanyMarketplaces, createCompanyMarketplace, updateCompanyMarketplace, deleteCompanyMarketplace,
  getBusinessEntities, createBusinessEntity,
  updateBusinessEntity, deleteBusinessEntity, getProductBusinessEntities,
  attachBusinessEntity, detachBusinessEntity,
} from '../../api/inventory'
import type { SaveVariantsPayload } from '../../api/inventory'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import type { Product, Supplier, BusinessEntity, PaginatedResponse } from '../../types/inventory'

export const useCategories = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: ['categories', params],
    queryFn: () => getCategories(params).then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createCategory(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useUpdateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      updateCategory(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useDeleteCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useProducts = (page = 1, pageSize = 20, search?: string, category?: string, ordering?: string) => {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (search) params.search = search
  if (category) params.category = category
  if (ordering) params.ordering = ordering
  return useQuery({
    queryKey: ['products', page, pageSize, search, category, ordering],
    queryFn: () => getProducts(params).then(r => r.data),
  })
}

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createProduct(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['variant-search'] })
    },
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useProductVariants = (page = 1, pageSize = 100) =>
  useQuery({
    queryKey: ['product-variants', page, pageSize],
    queryFn: () => getProductVariants({ page, page_size: pageSize }).then(r => r.data),
  })

export const useVariantSearch = (
  params: { search?: string; page_size?: number; supplier_id?: string },
  enabled = true,
) =>
  useQuery({
    queryKey: ['variant-search', params],
    queryFn: () => getProductVariantStocks({ ...params }).then(r => r.data),
    enabled,
  })

export function useWarehouses(page = 1, pageSize = 100) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['warehouses', user?.company_id ?? null, page, pageSize],
    queryFn: () => getWarehouses({ page, page_size: pageSize }).then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })
}

export const useCreateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createWarehouse(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export const useUpdateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateWarehouse(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export const useStockMovements = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => getStockMovements(params).then(r => r.data),
  })

export const useMasterCategories = () =>
  useQuery({
    queryKey: ['master-categories'],
    queryFn: () => getMasterCategories().then(r => r.data),
    staleTime: Infinity,
  })

export const useBulkCreateProducts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown[]) => bulkCreateProducts(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useBulkUpdateInventory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: Parameters<typeof bulkUpdateInventory>[0]) => bulkUpdateInventory(updates).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-movements'] }),
  })
}

export const useProductVariantStocks = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['product-variant-stocks', params],
    queryFn: () => getProductVariantStocks(params).then(r => r.data),
  })

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof adjustStock>[0]) => adjustStock(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-variant-stocks'] })
      qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })
}

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ['product', id],
    queryFn: () => client.get<Product>(`/product/${id}/`).then(r => r.data),
    enabled: !!id,
  })

export const useAvgSales = (variantIds: string[], days: number) =>
  useQuery({
    queryKey: ['avg-sales', variantIds, days],
    queryFn: () => getAvgSales(variantIds, days).then(r => r.data),
    enabled: variantIds.length > 0,
  })

export const useAllVariants = () =>
  useQuery({
    queryKey: ['all-variants'],
    queryFn: () =>
      getProductVariants({ page_size: 500, is_active: 'true' }).then(r => r.data),
  })

export const useInventorySummary = () =>
  useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => getInventorySummary().then(r => r.data),
  })

export const useStockClosingReport = (month: string, warehouseId: string) => {
  const [year, mon] = month.split("-")
  const monthStart = `${year}-${mon}-01`
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
  const monthEnd = `${year}-${mon}-${String(lastDay).padStart(2, "0")}`

  return useQuery({
    queryKey: ["stock-closing", month, warehouseId],
    queryFn: () => {
      const params: Record<string, string | number> = {
        page_size: 1000,
        cdate_after: monthStart,
        cdate_before: monthEnd,
      }
      if (warehouseId) params.warehouse = warehouseId
      return getStockMovements(params).then(r => r.data)
    },
    enabled: !!month,
  })
}

export const useUpdateVariantPrice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, variantId, basePrice }: { productId: string; variantId: string; basePrice: number }) =>
      updateVariantPrice(productId, variantId, basePrice).then(r => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['product', variables.productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-summary'] })
    },
  })
}

const supplierHooks = createCrudHooks<Supplier, PaginatedResponse<Supplier>, unknown, unknown>({
  resource: 'suppliers',
  list: (params) => getSuppliers(params).then(r => r.data),
  create: (data) => createSupplier(data).then(r => r.data),
  update: ({ id, data }) => updateSupplier(id, data).then(r => r.data),
  remove: (id) => deleteSupplier(id),
})
export const useSuppliers = supplierHooks.useList
export const useCreateSupplier = supplierHooks.useCreate
export const useUpdateSupplier = supplierHooks.useUpdate
export const useDeleteSupplier = supplierHooks.useDelete

export const useProductSuppliers = (productId: string) =>
  useQuery({
    queryKey: ['product-suppliers', productId],
    queryFn: () => getProductSuppliers({ product_id: productId }).then(r => r.data),
    enabled: !!productId,
  })

export const useCreateProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { supplier_id: string; supplier_link?: string | null }) =>
      createProductSupplier({ product_id: productId, ...data }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-suppliers', productId] }),
  })
}

export const useDeleteProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-suppliers', productId] }),
  })
}

export const useUpdateProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, supplier_link }: { id: string; supplier_link: string | null }) =>
      updateProductSupplier(id, { supplier_link }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-suppliers', productId] }),
  })
}

export const useCompanyMarketplaces = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: ['company-marketplaces', params],
    queryFn: () => getCompanyMarketplaces({ page_size: 100, ...params }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })

export const useCreateCompanyMarketplace = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; is_active?: boolean }) =>
      createCompanyMarketplace(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-marketplaces'] }),
  })
}

export const useUpdateCompanyMarketplace = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; is_active: boolean }> }) =>
      updateCompanyMarketplace(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-marketplaces'] }),
  })
}

export const useDeleteCompanyMarketplace = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCompanyMarketplace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-marketplaces'] }),
  })
}

const businessEntityHooks = createCrudHooks<
  BusinessEntity, PaginatedResponse<BusinessEntity>,
  { name: string; marketplace_id: string; is_active?: boolean },
  Partial<{ name: string; marketplace_id: string; is_active: boolean }>
>({
  resource: 'business-entities',
  list: (params) => getBusinessEntities(params).then(r => r.data),
  create: (data) => createBusinessEntity(data).then(r => r.data),
  update: ({ id, data }) => updateBusinessEntity(id, data).then(r => r.data),
  remove: (id) => deleteBusinessEntity(id),
})
export const useBusinessEntities = businessEntityHooks.useList
export const useCreateBusinessEntity = businessEntityHooks.useCreate
export const useUpdateBusinessEntity = businessEntityHooks.useUpdate
export const useDeleteBusinessEntity = businessEntityHooks.useDelete

export const useProductBusinessEntities = (productId: string) =>
  useQuery({
    queryKey: ['product-business-entities', productId],
    queryFn: () => getProductBusinessEntities({ product_id: productId }).then(r => r.data),
    enabled: !!productId,
  })

export const useAttachBusinessEntity = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (businessEntityId: string) =>
      attachBusinessEntity({ product_id: productId, business_entity_id: businessEntityId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-business-entities', productId] }),
  })
}

export const useDetachBusinessEntity = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => detachBusinessEntity(assignmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-business-entities', productId] }),
  })
}

export const useSaveVariants = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveVariantsPayload) => saveVariants(productId, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', productId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUploadVariantPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ variantId, image }: { variantId: string; image: File }) =>
      uploadVariantPhoto(productId, variantId, image).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product', productId] }),
  })
}

/**
 * Variant of useUploadVariantPhoto where productId is provided per-call,
 * for pages that upload photos across many products (e.g. PO detail item rows).
 */
export const useUploadAnyVariantPhoto = () =>
  useMutation({
    mutationFn: ({ productId, variantId, image }: { productId: string; variantId: string; image: File }) =>
      uploadVariantPhoto(productId, variantId, image).then(r => r.data),
  })

export const useDeleteVariantPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variantId: string) => deleteVariantPhoto(productId, variantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product', productId] }),
  })
}

export const useUploadDimensionImage = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dimKey, dimValue, photo }: { dimKey: string; dimValue: string; photo: File }) =>
      uploadDimensionImage(productId, dimKey, dimValue, photo).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product', productId] }),
  })
}

export const useDeleteDimensionImage = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dimKey, dimValue }: { dimKey: string; dimValue: string }) =>
      deleteDimensionImage(productId, dimKey, dimValue),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product', productId] }),
  })
}
