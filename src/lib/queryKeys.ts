/**
 * Query-key factory scaffolding.
 *
 * Creates a per-domain keys object with the standard hierarchy:
 *   all       → ['<resource>']
 *   lists     → ['<resource>', 'list']
 *   list(f)   → ['<resource>', 'list', filters]
 *   details   → ['<resource>', 'detail']
 *   detail(id)→ ['<resource>', 'detail', id]
 *
 * Usage:
 *   export const categoryKeys = createQueryKeys('categories')
 *   // In a hook:
 *   queryKey: categoryKeys.list({ page: 1 })
 *   // In invalidation:
 *   qc.invalidateQueries({ queryKey: categoryKeys.lists() })
 *
 * Per-domain key objects are created in their respective domain tickets.
 * This module provides the factory that all domains use.
 */

export type QueryKeyFactory<TFilters = Record<string, unknown>> = {
  /** Matches everything for this resource */
  all: () => readonly [string]
  /** Matches all list queries */
  lists: () => readonly [string, 'list']
  /** Matches a specific list query with filters */
  list: (filters?: TFilters) => readonly [string, 'list', TFilters | undefined]
  /** Matches all detail queries */
  details: () => readonly [string, 'detail']
  /** Matches a specific detail query by id */
  detail: (id: string | number) => readonly [string, 'detail', string | number]
}

export function createQueryKeys<TFilters = Record<string, unknown>>(
  resource: string,
): QueryKeyFactory<TFilters> {
  return {
    all: () => [resource] as const,
    lists: () => [resource, 'list'] as const,
    list: (filters?: TFilters) => [resource, 'list', filters] as const,
    details: () => [resource, 'detail'] as const,
    detail: (id: string | number) => [resource, 'detail', id] as const,
  }
}
