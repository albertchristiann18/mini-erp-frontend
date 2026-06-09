import client from './client'
import type { AvgSalesResult, Product, ProductVariant, ProductVariantStock, Warehouse, StockMovement, Category, PaginatedResponse, InventorySummaryResponse, Supplier, ProductVariantSupplier } from '../types/inventory'

export const getCategories = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Category>>('/category/', { params })

export const createCategory = (data: unknown) =>
  client.post<Category>('/category/', data)

export const updateCategory = (id: string, data: unknown) =>
  client.patch<Category>(`/category/${id}/`, data)

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

export const getVariantSuppliers = (params?: Record<string, string>) =>
  client.get<PaginatedResponse<ProductVariantSupplier>>('/variant-suppliers/', { params })

export const createVariantSupplier = (data: unknown) =>
  client.post<ProductVariantSupplier>('/variant-suppliers/', data)

export const updateVariantSupplier = (id: string, data: unknown) =>
  client.patch<ProductVariantSupplier>(`/variant-suppliers/${id}/`, data)

export const deleteVariantSupplier = (id: string) =>
  client.delete(`/variant-suppliers/${id}/`)
