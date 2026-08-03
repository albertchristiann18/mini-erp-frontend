/**
 * useProductDetail — state machine for ProductDetailPage.
 *
 * Owns: the `id` param, all useInventory queries/mutations, the price-edit
 * state machine (editingPrices/editedPrices/isSavingPrices), the supplier-link
 * edit state (editingSupplierLinkId/editingSupplierLink), the attach-BE modal
 * state (showAttachModal/attachingId), and all derived values (variants/photos/
 * dims/activeVariants/marketplaceIds/assignments/attachedMarketplaceIds/availableBEs).
 *
 * Components receive a view-model slice + callbacks — they never call api/ directly.
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useProduct,
  useSaveVariants,
  useProductSuppliers,
  useProductBusinessEntities,
  useAttachBusinessEntity,
  useDetachBusinessEntity,
  useBusinessEntities,
  useUpdateProductSupplier,
} from '../api/inventory'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../lib/toast'
import { productKeys } from '../../lib/inventoryKeys'
import { buildDims } from './productDetailHelpers'
import type { VariantDimension, ProductVariant, ProductPhoto } from '../../types/inventory'
import type { SaveVariantsPayload } from '../../api/inventory'
import type { ApiError } from '../../lib/errors'

// ─── Public result type ───────────────────────────────────────────────────────

export interface UseProductDetailResult {
  // routing
  id: string
  navigate: ReturnType<typeof useNavigate>
  user: { is_staff: boolean } | null | undefined

  // product query
  product: ReturnType<typeof useProduct>['data']
  isLoading: boolean
  isError: boolean
  error: ApiError | null
  refetchProduct: () => void

  // derived
  variants: ProductVariant[]
  photos: ProductPhoto[]
  dims: VariantDimension[]
  activeVariants: ProductVariant[]
  marketplaceIds: string[]

  // price-edit
  editingPrices: boolean
  editedPrices: Record<string, number>
  isSavingPrices: boolean
  setEditedPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>
  handleStartEditPrices: () => void
  handleCancelPrices: () => void
  handleSavePrices: () => Promise<void>

  // supplier-link edit
  editingSupplierLinkId: string | null
  editingSupplierLink: string
  setEditingSupplierLinkId: React.Dispatch<React.SetStateAction<string | null>>
  setEditingSupplierLink: React.Dispatch<React.SetStateAction<string>>
  handleSaveSupplierLink: () => Promise<void>
  updateSupplierLinkMutation: ReturnType<typeof useUpdateProductSupplier>

  // business entities
  productSuppliersData: ReturnType<typeof useProductSuppliers>['data']
  assignments: ReturnType<typeof useProductBusinessEntities>['data'] extends { results: infer R } | undefined ? R : never[]
  attachedMarketplaceIds: Set<string>
  availableBEs: ReturnType<typeof useBusinessEntities>['data'] extends { results: infer R } | undefined ? R : never[]

  // attach modal
  showAttachModal: boolean
  attachingId: string
  setShowAttachModal: React.Dispatch<React.SetStateAction<boolean>>
  setAttachingId: React.Dispatch<React.SetStateAction<string>>
  attachMutation: ReturnType<typeof useAttachBusinessEntity>
  detachMutation: ReturnType<typeof useDetachBusinessEntity>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProductDetail(): UseProductDetailResult {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  // ── Queries ──────────────────────────────────────────────────────────────
  const {
    data: product,
    isLoading,
    isError,
    error: productQueryError,
    refetch: refetchProduct,
  } = useProduct(id!)

  const productError = isError ? (productQueryError as unknown as ApiError) : null

  const { data: productSuppliersData } = useProductSuppliers(id!)
  const { data: productBEData } = useProductBusinessEntities(id!)
  const { data: allBEData } = useBusinessEntities({ page_size: 100, is_active: 'true' })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useSaveVariants(id!)
  const attachMutation = useAttachBusinessEntity(id!)
  const detachMutation = useDetachBusinessEntity(id!)
  const updateSupplierLinkMutation = useUpdateProductSupplier(id!)

  // ── Price-edit state ──────────────────────────────────────────────────────
  const [editingPrices, setEditingPrices] = useState(false)
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
  const [isSavingPrices, setIsSavingPrices] = useState(false)

  // ── Supplier-link state ───────────────────────────────────────────────────
  const [editingSupplierLinkId, setEditingSupplierLinkId] = useState<string | null>(null)
  const [editingSupplierLink, setEditingSupplierLink] = useState('')

  // ── Attach-BE modal state ─────────────────────────────────────────────────
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachingId, setAttachingId] = useState('')

  // ── Derived values ────────────────────────────────────────────────────────
  const variants = product?.variants ?? []
  const photos = product?.photos ?? []
  const rawOpts = product?.variant_options as Record<string, string[]> | undefined
  const dims = buildDims(rawOpts)
  const activeVariants = variants.filter(v => v.is_active)
  const marketplaceIds = [...new Set(
    variants.flatMap(v => (v.marketplace_listings ?? []).map((l: { marketplace_id: string }) => l.marketplace_id))
  )]

  const assignments = productBEData?.results ?? []
  const attachedMarketplaceIds = new Set(assignments.map(a => a.marketplace_id))
  const availableBEs = (allBEData?.results ?? []).filter(be => be.is_active)

  // ── Price-edit handlers ───────────────────────────────────────────────────
  const handleStartEditPrices = () => {
    const initial: Record<string, number> = {}
    variants.filter(v => v.is_active).forEach(v => { initial[v.id] = v.base_price })
    setEditedPrices(initial)
    setEditingPrices(true)
  }

  const handleCancelPrices = () => {
    setEditingPrices(false)
    setEditedPrices({})
  }

  const handleSavePrices = async () => {
    if (!product) return
    setIsSavingPrices(true)
    try {
      const payload: SaveVariantsPayload = {
        variant_options: Object.fromEntries(
          dims.map(d => [d.name, d.values.map(v => v.label)])
        ),
        variants: variants
          .filter(v => v.is_active)
          .map(v => ({
            id: v.id,
            variant_values: v.variant_values ?? {},
            sku_variant_code: v.sku_variant_code,
            base_price: editedPrices[v.id] ?? v.base_price,
          })),
      }
      await saveMutation.mutateAsync(payload)
      qc.invalidateQueries({ queryKey: productKeys.detail(id!) })
      toast.success('Prices saved')
      setEditingPrices(false)
      setEditedPrices({})
    } catch {
      toast.error('Failed to save prices')
    } finally {
      setIsSavingPrices(false)
    }
  }

  // ── Supplier-link handler ─────────────────────────────────────────────────
  const handleSaveSupplierLink = async () => {
    if (!editingSupplierLinkId) return
    try {
      await updateSupplierLinkMutation.mutateAsync({
        id: editingSupplierLinkId,
        supplier_link: editingSupplierLink.trim() || null,
      })
      toast.success('Supplier link updated')
      setEditingSupplierLinkId(null)
    } catch {
      toast.error('Failed to update supplier link')
    }
  }

  return {
    id: id!,
    navigate,
    user,

    product,
    isLoading,
    isError,
    error: productError,
    refetchProduct,

    variants,
    photos,
    dims,
    activeVariants,
    marketplaceIds,

    editingPrices,
    editedPrices,
    isSavingPrices,
    setEditedPrices,
    handleStartEditPrices,
    handleCancelPrices,
    handleSavePrices,

    editingSupplierLinkId,
    editingSupplierLink,
    setEditingSupplierLinkId,
    setEditingSupplierLink,
    handleSaveSupplierLink,
    updateSupplierLinkMutation,

    productSuppliersData,
    assignments,
    attachedMarketplaceIds,
    availableBEs,

    showAttachModal,
    attachingId,
    setShowAttachModal,
    setAttachingId,
    attachMutation,
    detachMutation,
  }
}
