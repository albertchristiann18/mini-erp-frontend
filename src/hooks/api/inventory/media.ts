import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  uploadVariantPhoto, deleteVariantPhoto, uploadDimensionImage, deleteDimensionImage,
  uploadProductPhoto, deleteProductPhoto, reorderProductPhotos,
} from '../../../api/inventory'
import { productKeys } from '../../../lib/inventoryKeys'

// ─── Photo hooks ──────────────────────────────────────────────────────────────

export const useUploadVariantPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ variantId, image }: { variantId: string; image: File }) =>
      uploadVariantPhoto(productId, variantId, image),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

/**
 * Variant of useUploadVariantPhoto where productId is provided per-call,
 * for pages that upload photos across many products (e.g. PO detail item rows).
 */
export const useUploadAnyVariantPhoto = () =>
  useMutation({
    mutationFn: ({ productId, variantId, image }: { productId: string; variantId: string; image: File }) =>
      uploadVariantPhoto(productId, variantId, image),
  })

export const useDeleteVariantPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variantId: string) => deleteVariantPhoto(productId, variantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useUploadDimensionImage = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dimKey, dimValue, photo }: { dimKey: string; dimValue: string; photo: File }) =>
      uploadDimensionImage(productId, dimKey, dimValue, photo),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useDeleteDimensionImage = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dimKey, dimValue }: { dimKey: string; dimValue: string }) =>
      deleteDimensionImage(productId, dimKey, dimValue),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

// ─── Photo upload hooks (product-level) ───────────────────────────────────────

export const useUploadProductPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (image: File) => uploadProductPhoto(productId, image),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useUploadAnyProductPhoto = () =>
  useMutation({
    mutationFn: ({ productId, image }: { productId: string; image: File }) =>
      uploadProductPhoto(productId, image),
  })

export const useDeleteProductPhoto = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: string) => deleteProductPhoto(productId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}

export const useReorderProductPhotos = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoIds: string[]) => reorderProductPhotos(productId, photoIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.detail(productId) }),
  })
}
