import client from './client'
import type { Product, ProductVariant, Warehouse, StockMovement, Category, PaginatedResponse } from '../types/inventory'

export const getCategories = () =>
  client.get<PaginatedResponse<Category>>('/category/')

export const getProducts = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<Product>>('/product/', { params })

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
