/**
 * Inventory domain query-key factories.
 *
 * Single source of truth for all inventory query keys and invalidation targets.
 * Pass these factories to createCrudHooks and use them directly in hand-written hooks.
 */
import { createQueryKeys } from './queryKeys'

export const categoryKeys = createQueryKeys('categories')
export const warehouseKeys = createQueryKeys('warehouses')
export const supplierKeys = createQueryKeys('suppliers')
export const masterCategoryKeys = createQueryKeys('master-categories')
export const companyMarketplaceKeys = createQueryKeys('company-marketplaces')
export const businessEntityKeys = createQueryKeys('business-entities')

export const productKeys = createQueryKeys('products')
export const productVariantKeys = createQueryKeys('product-variants')
export const stockMovementKeys = createQueryKeys('stock-movements')
export const inventorySummaryKeys = createQueryKeys('inventory-summary')
export const avgSalesKeys = createQueryKeys('avg-sales')
export const productVariantStockKeys = createQueryKeys('product-variant-stocks')
export const variantSearchKeys = createQueryKeys('variant-search')
export const productSupplierKeys = createQueryKeys('product-suppliers')
export const productBusinessEntityKeys = createQueryKeys('product-business-entities')
