/**
 * Inventory API-hook barrel.
 *
 * Re-exports every inventory hook under its existing name so importers don't
 * need to change which hook names they call. Split by resource into this
 * folder (ticket #22) — see the individual resource files for implementation.
 */
export * from './categories'
export * from './warehouses'
export * from './products'
export * from './variants'
export * from './stock'
export * from './suppliers'
export * from './productSuppliers'
export * from './companyMarketplaces'
export * from './businessEntities'
export * from './media'
