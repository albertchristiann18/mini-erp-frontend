import client from './client'
import type { AvgSalesResult, Product, ProductVariant, ProductVariantStock, Warehouse, StockMovement, Category, PaginatedResponse, InventorySummaryResponse, Supplier, ProductSupplier, CompanyMarketplace, BusinessEntity, ProductBusinessEntity } from '../types/inventory'

export const getCategories = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Category>>('/category/', { params })

export const createCategory = (data: unknown) =>
  client.post<Category>('/category/', data)

export const updateCategory = (id: string, data: unknown) =>
  client.patch<Category>(`/category/${id}/`, data)

export const deleteCategory = (id: string) =>
  client.delete(`/category/${id}/`)

export const getProducts = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Product>>('/product/', { params })

export const getProductVariantStocks = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<ProductVariantStock>>('/product-variants/', { params })

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

export const createProduct = (data: unknown) =>
  client.post<CreatedProduct>('/product/', data)

export const updateProduct = (id: string, data: unknown) =>
  client.patch(`/product/${id}/`, data)

export const getProductVariants = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<ProductVariant>>('/product-variants/', { params })

export const getWarehouses = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Warehouse>>('/warehouse/', { params })

export const createWarehouse = (data: unknown) =>
  client.post('/warehouse/', data)

export const updateWarehouse = (id: string, data: unknown) =>
  client.patch(`/warehouse/${id}/`, data)

export const getStockMovements = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<StockMovement>>('/stock-movements/', { params })

export const getMasterCategories = () =>
  client.get<Array<{key: string; label: string; shopee_id: number; tiktok_id: string}>>('/master-categories/')

export const uploadProductPhoto = (productId: string, image: File) => {
  const form = new FormData()
  form.append('image', image)
  return client.post<{id: string; image_url: string; order: number; is_primary: boolean}>(`/product/${productId}/photos/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const deleteProductPhoto = (productId: string, photoId: string) =>
  client.delete(`/product/${productId}/photos/${photoId}/`)

export const reorderProductPhotos = (productId: string, photoIds: string[]) =>
  client.patch(`/product/${productId}/photos/${photoIds[0]}/reorder/`, { photo_ids: photoIds })

export const bulkCreateProducts = (data: unknown[]) =>
  client.post('/product/bulk_create/', data)

export interface InventoryUpdate {
  variant_id: string
  warehouse_id: string
  qty: number
  type: 'replace' | 'add' | 'min'
}

export const bulkUpdateInventory = (updates: InventoryUpdate[]) =>
  client.post('/inventory/bulk_update/', updates)

export const adjustStock = (data: { variant_id: string; warehouse_id: string; type: 'add' | 'min' | 'set'; qty: number }) =>
  client.post('/inventory/adjust/', data)

export const getAvgSales = (variantIds: string[], days: number) =>
  client.get<AvgSalesResult>('/avg-sales/', {
    params: { variant_ids: variantIds.join(','), days },
  })

export const getInventorySummary = () =>
  client.get<InventorySummaryResponse>('/inventory-summary/')

export const updateVariantPrice = (productId: string, variantId: string, basePrice: number) =>
  client.patch<{ id: string; base_price: number }>(
    `/product/${productId}/update_variant_price/${variantId}/`,
    { base_price: basePrice }
  )

export const getSuppliers = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Supplier>>('/suppliers/', { params })

export const createSupplier = (data: unknown) =>
  client.post<Supplier>('/suppliers/', data)

export const updateSupplier = (id: string, data: unknown) =>
  client.patch<Supplier>(`/suppliers/${id}/`, data)

export const deleteSupplier = (id: string) =>
  client.delete(`/suppliers/${id}/`)

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

export const saveVariants = (productId: string, data: SaveVariantsPayload) =>
  client.post<SaveVariantsResult>(`/product/${productId}/save_variants/`, data)

export const getProductSuppliers = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<ProductSupplier>>('/product-suppliers/', { params })

export const createProductSupplier = (data: { product_id: string; supplier_id: string; supplier_link?: string | null }) =>
  client.post<ProductSupplier>('/product-suppliers/', data)

export const deleteProductSupplier = (id: string) =>
  client.delete(`/product-suppliers/${id}/`)

export const getCompanyMarketplaces = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<CompanyMarketplace>>('/company-marketplaces/', { params })

export const createCompanyMarketplace = (data: { name: string; is_active?: boolean }) =>
  client.post<CompanyMarketplace>('/company-marketplaces/', data)

export const updateCompanyMarketplace = (id: string, data: Partial<{ name: string; is_active: boolean }>) =>
  client.patch<CompanyMarketplace>(`/company-marketplaces/${id}/`, data)

export const deleteCompanyMarketplace = (id: string) =>
  client.delete(`/company-marketplaces/${id}/`)

export const getBusinessEntities = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<BusinessEntity>>('/business-entities/', { params })

export const createBusinessEntity = (data: { name: string; marketplace_id: string; is_active?: boolean }) =>
  client.post<BusinessEntity>('/business-entities/', data)

export const updateBusinessEntity = (id: string, data: Partial<{ name: string; marketplace_id: string; is_active: boolean }>) =>
  client.patch<BusinessEntity>(`/business-entities/${id}/`, data)

export const deleteBusinessEntity = (id: string) =>
  client.delete(`/business-entities/${id}/`)

export const getProductBusinessEntities = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<ProductBusinessEntity>>('/product-business-entities/', { params })

export const attachBusinessEntity = (data: { product_id: string; business_entity_id: string }) =>
  client.post<{ id: string; product_id: string; business_entity_id: string; created: boolean }>(
    '/product-business-entities/', data
  )

export const detachBusinessEntity = (id: string) =>
  client.delete(`/product-business-entities/${id}/`)

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
  not_found: string[]
  errors: string[]
  summary: {
    total: number
    reconciled: number
    skipped: number
    not_found: number
  }
  dry_run: boolean
}

export const marketplaceReconcileStock = (formData: FormData) =>
  client.post<ReconcileResult>('/inventory/marketplace_reconcile/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
