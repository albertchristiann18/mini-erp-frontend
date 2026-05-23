import client from './client'
import type { Product, ProductVariant, ProductVariantStock, Warehouse, StockMovement, Category, PaginatedResponse } from '../types/inventory'

export const getCategories = () =>
  client.get<PaginatedResponse<Category>>('/category/')

export const getProducts = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Product>>('/product/', { params })

export const getProductVariantStocks = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<ProductVariantStock>>('/product-variants/', { params })

export const createProduct = (data: unknown) =>
  client.post('/product/', data)

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
