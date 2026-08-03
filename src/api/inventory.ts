import { http } from '../lib/http'
import type { AvgSalesResult, Product, ProductVariant, ProductVariantStock, Warehouse, StockMovement, Category, PaginatedResponse, InventorySummaryResponse, Supplier, ProductSupplier, CompanyMarketplace, BusinessEntity, ProductBusinessEntity } from '../types/inventory'

export const getCategories = (params?: Record<string, string | number>): Promise<PaginatedResponse<Category>> =>
  http.get<PaginatedResponse<Category>>('/category/', { params })

export const createCategory = (data: unknown): Promise<Category> =>
  http.post<Category>('/category/', data)

export const updateCategory = (id: string, data: unknown): Promise<Category> =>
  http.patch<Category>(`/category/${id}/`, data)

export const deleteCategory = (id: string): Promise<unknown> =>
  http.delete(`/category/${id}/`)

export const getProducts = (params?: Record<string, string | number>): Promise<PaginatedResponse<Product>> =>
  http.get<PaginatedResponse<Product>>('/product/', { params })

export const getProductVariantStocks = (params?: Record<string, string | number>): Promise<PaginatedResponse<ProductVariantStock>> =>
  http.get<PaginatedResponse<ProductVariantStock>>('/product-variants/', { params })

export interface CreatedProductVariant {
  id: string
  name: string
  sku_variant_code: string
}

export interface CreatedProduct {
  id: string
  name: string
  variants: CreatedProductVariant[]
}

export const createProduct = (data: unknown): Promise<CreatedProduct> =>
  http.post<CreatedProduct>('/product/', data)

export const updateProduct = (id: string, data: unknown): Promise<unknown> =>
  http.patch(`/product/${id}/`, data)

export const getProductVariants = (params?: Record<string, string | number>): Promise<PaginatedResponse<ProductVariant>> =>
  http.get<PaginatedResponse<ProductVariant>>('/product-variants/', { params })

export const getWarehouses = (params?: Record<string, string | number>): Promise<PaginatedResponse<Warehouse>> =>
  http.get<PaginatedResponse<Warehouse>>('/warehouse/', { params })

export const createWarehouse = (data: unknown): Promise<Warehouse> =>
  http.post<Warehouse>('/warehouse/', data)

export const updateWarehouse = (id: string, data: unknown): Promise<Warehouse> =>
  http.patch<Warehouse>(`/warehouse/${id}/`, data)

export const deleteWarehouse = (id: string): Promise<unknown> =>
  http.delete(`/warehouse/${id}/`)

export const getStockMovements = (params?: Record<string, string | number>): Promise<PaginatedResponse<StockMovement>> =>
  http.get<PaginatedResponse<StockMovement>>('/stock-movements/', { params })

export const getMasterCategories = (): Promise<Array<{key: string; label: string; shopee_id: number; tiktok_id: string}>> =>
  http.get<Array<{key: string; label: string; shopee_id: number; tiktok_id: string}>>('/master-categories/')

export const uploadProductPhoto = (productId: string, image: File): Promise<{id: string; image_url: string; order: number; is_primary: boolean}> => {
  const form = new FormData()
  form.append('image', image)
  return http.post<{id: string; image_url: string; order: number; is_primary: boolean}>(`/product/${productId}/photos/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const uploadVariantPhoto = (productId: string, variantId: string, image: File): Promise<{ photo_url: string }> => {
  const form = new FormData()
  form.append('image', image)
  return http.post<{ photo_url: string }>(
    `/product/${productId}/variants/${variantId}/photo/`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

export const deleteVariantPhoto = (productId: string, variantId: string): Promise<unknown> =>
  http.delete(`/product/${productId}/variants/${variantId}/photo/`)

export const deleteProductPhoto = (productId: string, photoId: string): Promise<unknown> =>
  http.delete(`/product/${productId}/photos/${photoId}/`)

export const reorderProductPhotos = (productId: string, photoIds: string[]): Promise<unknown> =>
  http.patch(`/product/${productId}/photos/${photoIds[0]}/reorder/`, { photo_ids: photoIds })

export interface BulkCreateResult {
  created: number
  errors: string[]
}

export const bulkCreateProducts = (data: unknown[]): Promise<BulkCreateResult> =>
  http.post<BulkCreateResult>('/product/bulk_create/', data)

export interface InventoryUpdate {
  variant_id: string
  warehouse_id: string
  qty: number
  type: 'replace' | 'add' | 'min'
}

export interface BulkUpdateResult {
  summary: {
    successful: number
    failed: number
  }
}

export const bulkUpdateInventory = (updates: InventoryUpdate[]): Promise<BulkUpdateResult> =>
  http.post<BulkUpdateResult>('/inventory/bulk_update/', updates)

export const adjustStock = (data: { variant_id: string; warehouse_id: string; type: 'add' | 'min' | 'set'; qty: number }): Promise<unknown> =>
  http.post('/inventory/adjust/', data)

export const getAvgSales = (variantIds: string[], days: number): Promise<AvgSalesResult> =>
  http.get<AvgSalesResult>('/avg-sales/', {
    params: { variant_ids: variantIds.join(','), days },
  })

export const getInventorySummary = (): Promise<InventorySummaryResponse> =>
  http.get<InventorySummaryResponse>('/inventory-summary/')

export const updateVariantPrice = (productId: string, variantId: string, basePrice: number): Promise<{ id: string; base_price: number }> =>
  http.patch<{ id: string; base_price: number }>(
    `/product/${productId}/update_variant_price/${variantId}/`,
    { base_price: basePrice }
  )

export const getSuppliers = (params?: Record<string, string | number>): Promise<PaginatedResponse<Supplier>> =>
  http.get<PaginatedResponse<Supplier>>('/suppliers/', { params })

export const createSupplier = (data: unknown): Promise<Supplier> =>
  http.post<Supplier>('/suppliers/', data)

export const updateSupplier = (id: string, data: unknown): Promise<Supplier> =>
  http.patch<Supplier>(`/suppliers/${id}/`, data)

export const deleteSupplier = (id: string): Promise<unknown> =>
  http.delete(`/suppliers/${id}/`)

export interface SaveVariantItem {
  id?: string
  variant_values: Record<string, string>
  sku_variant_code: string
  base_price: number
}

export interface SaveVariantsPayload {
  variant_options: Record<string, string[]>
  variants: SaveVariantItem[]
}

export interface SaveVariantsResult {
  product_id: string
  created: number
  updated: number
  deactivated: string[]
  kept_with_stock: string[]
}

export const saveVariants = (productId: string, data: SaveVariantsPayload): Promise<SaveVariantsResult> =>
  http.post<SaveVariantsResult>(`/product/${productId}/save_variants/`, data)

export const getProductSuppliers = (params?: Record<string, string | number>): Promise<PaginatedResponse<ProductSupplier>> =>
  http.get<PaginatedResponse<ProductSupplier>>('/product-suppliers/', { params })

export const createProductSupplier = (data: { product_id: string; supplier_id: string; supplier_link?: string | null }): Promise<ProductSupplier> =>
  http.post<ProductSupplier>('/product-suppliers/', data)

export const deleteProductSupplier = (id: string): Promise<unknown> =>
  http.delete(`/product-suppliers/${id}/`)

export const updateProductSupplier = (id: string, data: { supplier_link: string | null }): Promise<ProductSupplier> =>
  http.patch<ProductSupplier>(`/product-suppliers/${id}/`, data)

export const getCompanyMarketplaces = (params?: Record<string, string | number>): Promise<PaginatedResponse<CompanyMarketplace>> =>
  http.get<PaginatedResponse<CompanyMarketplace>>('/company-marketplaces/', { params })

export const createCompanyMarketplace = (data: { name: string; is_active?: boolean }): Promise<CompanyMarketplace> =>
  http.post<CompanyMarketplace>('/company-marketplaces/', data)

export const updateCompanyMarketplace = (id: string, data: Partial<{ name: string; is_active: boolean }>): Promise<CompanyMarketplace> =>
  http.patch<CompanyMarketplace>(`/company-marketplaces/${id}/`, data)

export const deleteCompanyMarketplace = (id: string): Promise<unknown> =>
  http.delete(`/company-marketplaces/${id}/`)

export const getBusinessEntities = (params?: Record<string, string | number>): Promise<PaginatedResponse<BusinessEntity>> =>
  http.get<PaginatedResponse<BusinessEntity>>('/business-entities/', { params })

export const createBusinessEntity = (data: { name: string; marketplace_id: string; is_active?: boolean }): Promise<BusinessEntity> =>
  http.post<BusinessEntity>('/business-entities/', data)

export const updateBusinessEntity = (id: string, data: Partial<{ name: string; marketplace_id: string; is_active: boolean }>): Promise<BusinessEntity> =>
  http.patch<BusinessEntity>(`/business-entities/${id}/`, data)

export const deleteBusinessEntity = (id: string): Promise<unknown> =>
  http.delete(`/business-entities/${id}/`)

export const getProductBusinessEntities = (params?: Record<string, string | number>): Promise<PaginatedResponse<ProductBusinessEntity>> =>
  http.get<PaginatedResponse<ProductBusinessEntity>>('/product-business-entities/', { params })

export const attachBusinessEntity = (data: { product_id: string; business_entity_id: string }): Promise<{ id: string; product_id: string; business_entity_id: string; created: boolean }> =>
  http.post<{ id: string; product_id: string; business_entity_id: string; created: boolean }>(
    '/product-business-entities/', data
  )

export const detachBusinessEntity = (id: string): Promise<unknown> =>
  http.delete(`/product-business-entities/${id}/`)

export interface ReconcileRow {
  sku: string
  variant_id?: string
  before?: number
  after?: number
  delta?: number
  qty?: number
  product_name?: string
  variant_name?: string
}

export interface ReconcileResult {
  reconciled: ReconcileRow[]
  skipped: ReconcileRow[]
  not_found: Array<{sku: string; file_product_name: string; file_variant_name: string}>
  errors: string[]
  summary: {
    total: number
    reconciled: number
    skipped: number
    not_found: number
  }
  dry_run: boolean
}

export const marketplaceReconcileStock = (formData: FormData): Promise<ReconcileResult> =>
  http.post<ReconcileResult>('/inventory/marketplace_reconcile/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export interface DimensionImageResult {
  id: string
  dim_key: string
  dim_value: string
  photo_url: string | null
}

export const uploadDimensionImage = (
  productId: string,
  dimKey: string,
  dimValue: string,
  photo: File,
): Promise<DimensionImageResult> => {
  const form = new FormData()
  form.append('dim_key', dimKey)
  form.append('dim_value', dimValue)
  form.append('photo', photo)
  return http.post<DimensionImageResult>(
    `/product/${productId}/dimension-image/`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

export const deleteDimensionImage = (
  productId: string,
  dimKey: string,
  dimValue: string,
): Promise<void> =>
  http.delete<void>(`/product/${productId}/dimension-image/`, {
    data: { dim_key: dimKey, dim_value: dimValue },
  })
