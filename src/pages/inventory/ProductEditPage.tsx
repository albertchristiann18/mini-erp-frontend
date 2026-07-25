import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { ArrowLeft } from 'lucide-react'
import { VariasiSetupSection } from './VariasiSetup'
import { DaftarVariasiTable } from './DaftarVariasiTable'
import { useProductEdit } from '../../hooks/inventory/useProductEdit'
import { BasicInfoSection, SuppliersSection, BusinessEntitiesSection } from './ProductEdit'
import { toast } from '../../lib/toast'
import { Loading, ErrorState } from '../../components/ui/queryPrimitives'

export default function ProductEditPage() {
  const navigate = useNavigate()
  const {
    isEditing,
    id,
    form,
    isSaving,
    product,
    productLoading,
    productError,
    isProductError,
    refetchProduct,
    categories,
    photos,
    pendingFiles,
    setPhotos,
    setPendingFiles,
    brand,
    setBrand,
    dim1Key,
    dim1Options,
    dim2Key,
    dim2Options,
    showDim1,
    showDim2,
    dimensionImages,
    removeDimConfirm,
    setRemoveDimConfirm,
    setDim1Key,
    setDim2Key,
    rows,
    productSuppliersData,
    suppliersLoading,
    suppliersData,
    newSupplierSelectedId,
    newSupplierLink,
    supplierSearch,
    showAttachSupplierModal,
    createProductSupplierMutation,
    deleteProductSupplierMutation,
    setNewSupplierSelectedId,
    setNewSupplierLink,
    setSupplierSearch,
    setShowAttachSupplierModal,
    assignments,
    availableBEs,
    attachedMarketplaceIds,
    showAttachBEModal,
    attachingBEId,
    attachBEMutation,
    detachBEMutation,
    setShowAttachBEModal,
    setAttachingBEId,
    handleAddProductSupplier,
    handleRemoveRow,
    handleRowChange,
    handleDim1OptionsChange,
    handleDim2OptionsChange,
    handleAddVariasi,
    handleRemoveDim1,
    handleRemoveDim2,
    confirmRemoveDim,
    handleSwapConfirmed,
    handleBulkFillPrice,
    handleDimensionImageUpload,
    handleDimensionImageDelete,
    onSubmit,
  } = useProductEdit()

  if (isEditing && productLoading) {
    return <Loading />
  }

  if (isEditing && isProductError && productError) {
    return <ErrorState error={productError} onRetry={refetchProduct} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() =>
            navigate(isEditing ? `/inventory/products/${id}` : '/inventory/products')
          }
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">Inventory &gt; Products</p>
          <h1 className="text-xl font-semibold">
            {isEditing ? (product?.name ?? 'Edit Product') : 'New Product'}
          </h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pb-12">
        <BasicInfoSection
          form={form}
          categories={categories}
          isEditing={isEditing}
          brand={brand}
          setBrand={setBrand}
          photos={photos}
          pendingFiles={pendingFiles}
          onPhotosChange={setPhotos}
          onPendingFilesChange={setPendingFiles}
          productId={isEditing ? (id ?? null) : null}
        />

        {/* Variasi Section */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-6">Variasi Produk</h2>
          <VariasiSetupSection
            dim1Key={dim1Key}
            dim1Options={dim1Options}
            dim2Key={dim2Key}
            dim2Options={dim2Options}
            showDim1={showDim1}
            showDim2={showDim2}
            hasDim1Stock={rows.some(r => !r.removed && !!dim1Key && !!r.variantValues[dim1Key] && r.hasStock)}
            hasDim2Stock={rows.some(r => !r.removed && !!dim2Key && !!r.variantValues[dim2Key] && r.hasStock)}
            onDim1KeyChange={setDim1Key}
            onDim1OptionsChange={handleDim1OptionsChange}
            onDim2KeyChange={setDim2Key}
            onDim2OptionsChange={handleDim2OptionsChange}
            onAddVariasi={handleAddVariasi}
            onRemoveDim1={handleRemoveDim1}
            onRemoveDim2={handleRemoveDim2}
            onSwapConfirmed={handleSwapConfirmed}
            onToastError={toast.error}
          />
        </div>

        {/* Daftar Variasi */}
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold">
              Daftar Variasi ({rows.filter(r => !r.removed).length})
            </h2>
          </div>
          <DaftarVariasiTable
            dim1Key={dim1Key}
            dim2Key={dim2Key}
            dim1Options={dim1Options}
            dim2Options={dim2Options}
            rows={rows}
            dimensionImages={dimensionImages}
            isEditing={isEditing}
            onRowChange={handleRowChange}
            onRemoveRow={handleRemoveRow}
            onBulkFillPrice={handleBulkFillPrice}
            onDimensionImageUpload={handleDimensionImageUpload}
            onDimensionImageDelete={handleDimensionImageDelete}
          />
        </div>

        {isEditing && (
          <SuppliersSection
            productSuppliersData={productSuppliersData}
            suppliersLoading={suppliersLoading}
            suppliersData={suppliersData}
            newSupplierSelectedId={newSupplierSelectedId}
            newSupplierLink={newSupplierLink}
            supplierSearch={supplierSearch}
            showAttachSupplierModal={showAttachSupplierModal}
            createProductSupplierMutation={createProductSupplierMutation}
            deleteProductSupplierMutation={deleteProductSupplierMutation}
            setNewSupplierSelectedId={setNewSupplierSelectedId}
            setNewSupplierLink={setNewSupplierLink}
            setSupplierSearch={setSupplierSearch}
            setShowAttachSupplierModal={setShowAttachSupplierModal}
            onAddProductSupplier={handleAddProductSupplier}
          />
        )}

        {isEditing && (
          <BusinessEntitiesSection
            assignments={assignments}
            availableBEs={availableBEs}
            attachedMarketplaceIds={attachedMarketplaceIds}
            showAttachBEModal={showAttachBEModal}
            attachingBEId={attachingBEId}
            attachBEMutation={attachBEMutation}
            detachBEMutation={detachBEMutation}
            setShowAttachBEModal={setShowAttachBEModal}
            setAttachingBEId={setAttachingBEId}
          />
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(isEditing ? `/inventory/products/${id}` : '/inventory/products')
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>

      <Dialog open={removeDimConfirm !== null} onOpenChange={(open) => { if (!open) setRemoveDimConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Variasi {removeDimConfirm}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {removeDimConfirm === 1
              ? `Semua baris varian untuk "${dim1Key}" akan dihapus. Tindakan ini tidak dapat dibatalkan sebelum disimpan.`
              : `Semua baris varian untuk "${dim2Key}" akan dihapus. Tindakan ini tidak dapat dibatalkan sebelum disimpan.`
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDimConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmRemoveDim}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
