/**
 * ProductDetailPage — thin route wrapper.
 *
 * Wires the useProductDetail hook to presentational sub-components.
 * All state and business logic lives in the hook.
 */
import { useProductDetail } from '../../hooks/inventory/useProductDetail'
import { Loading, ErrorState, Empty } from '../../components/ui/queryPrimitives'
import {
  ProductDetailHeader,
  ProductInfoMedia,
  VariantDetailTable,
  MarketplaceIntegration,
  SuppliersSection,
  BusinessEntitiesSection,
} from './ProductDetail'

export default function ProductDetailPage() {
  const vm = useProductDetail()

  if (vm.isLoading) {
    return <Loading />
  }

  if (vm.isError && vm.error) {
    return <ErrorState error={vm.error} onRetry={vm.refetchProduct} />
  }

  if (!vm.product) {
    return <Empty message="Product not found" />
  }

  const isStaff = vm.user?.is_staff ?? false

  return (
    <div className="space-y-6">
      <ProductDetailHeader
        product={vm.product}
        isStaff={isStaff}
        onBack={() => vm.navigate('/inventory/products')}
        onEdit={() => vm.navigate(`/inventory/products/${vm.id}/edit`)}
      />

      <ProductInfoMedia
        product={vm.product}
        photos={vm.photos}
      />

      <VariantDetailTable
        activeVariants={vm.activeVariants}
        dims={vm.dims}
        isStaff={isStaff}
        editingPrices={vm.editingPrices}
        editedPrices={vm.editedPrices}
        isSavingPrices={vm.isSavingPrices}
        setEditedPrices={vm.setEditedPrices}
        onStartEditPrices={vm.handleStartEditPrices}
        onCancelPrices={vm.handleCancelPrices}
        onSavePrices={vm.handleSavePrices}
      />

      <MarketplaceIntegration
        marketplaceIds={vm.marketplaceIds}
      />

      <SuppliersSection
        productSuppliersData={vm.productSuppliersData}
        isStaff={isStaff}
        editingSupplierLinkId={vm.editingSupplierLinkId}
        editingSupplierLink={vm.editingSupplierLink}
        setEditingSupplierLinkId={vm.setEditingSupplierLinkId}
        setEditingSupplierLink={vm.setEditingSupplierLink}
        onSaveSupplierLink={vm.handleSaveSupplierLink}
        updateSupplierLinkIsPending={vm.updateSupplierLinkMutation.isPending}
      />

      <BusinessEntitiesSection
        assignments={vm.assignments}
        availableBEs={vm.availableBEs}
        attachedMarketplaceIds={vm.attachedMarketplaceIds}
        isStaff={isStaff}
        showAttachModal={vm.showAttachModal}
        attachingId={vm.attachingId}
        setShowAttachModal={vm.setShowAttachModal}
        setAttachingId={vm.setAttachingId}
        attachMutation={vm.attachMutation}
        detachMutation={vm.detachMutation}
      />
    </div>
  )
}
