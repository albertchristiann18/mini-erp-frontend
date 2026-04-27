import client from './client'
import type { Product, ProductVariant, Warehouse, StockMovement, PaginatedResponse } from '../types/inventory'

export const getProducts = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Product>>('/products/', { params })

export const getProductVariants = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<ProductVariant>>('/product-variants/', { params })

export const getWarehouses = () =>
  client.get<Warehouse[]>('/warehouses/')

export const getStockMovements = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<StockMovement>>('/stock-movements/', { params })
