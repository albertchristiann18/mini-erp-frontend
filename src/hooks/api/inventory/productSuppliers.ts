import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProductSuppliers, createProductSupplier, deleteProductSupplier, updateProductSupplier } from '../../../api/inventory'
import { productSupplierKeys } from '../../../lib/inventoryKeys'

// ─── Product Suppliers ────────────────────────────────────────────────────────

export const useProductSuppliers = (productId: string) =>
  useQuery({
    queryKey: productSupplierKeys.list({ productId }),
    queryFn: () => getProductSuppliers({ product_id: productId }),
    enabled: !!productId,
  })

export const useCreateProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { supplier_id: string; supplier_link?: string | null }) =>
      createProductSupplier({ product_id: productId, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productSupplierKeys.list({ productId }) }),
  })
}

export const useDeleteProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productSupplierKeys.list({ productId }) }),
  })
}

export const useUpdateProductSupplier = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, supplier_link }: { id: string; supplier_link: string | null }) =>
      updateProductSupplier(id, { supplier_link }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productSupplierKeys.list({ productId }) }),
  })
}
