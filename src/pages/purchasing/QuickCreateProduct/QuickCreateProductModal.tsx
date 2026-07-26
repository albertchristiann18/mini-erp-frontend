import { ImagePlus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { FormField } from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { CategorySelect } from '../../../components/ui/CategorySelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { useQuickCreateProduct } from '../../../hooks/purchasing/useQuickCreateProduct'
import type { CreatedVariant } from '../../../hooks/purchasing/useQuickCreateProduct'
import { PickerStep } from './PickerStep'
import { DimensionSection } from './DimensionSection'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (variants: CreatedVariant[]) => void
  supplierId?: string
}

export function QuickCreateProductModal({ open, onClose, onCreated, supplierId }: Props) {
  const {
    step,
    productName, setProductName,
    categoryId, setCategoryId,
    supplierLink, setSupplierLink,
    chosenSupplierId, setChosenSupplierId,
    productPhotoPreview,
    productPhotoInputRef,
    handleProductPhotoSelect,
    handleClearProductPhoto,
    dimensionRows,
    errors,
    skuError,
    addDimensionRow,
    removeDimensionRow,
    updateDimensionName,
    updateDimensionInputValue,
    addValueToDimension,
    removeValueFromDimension,
    updateValueCode,
    isSubmitting,
    handleSubmit,
    handleClose,
    supplierOptions,
    createdVariants,
    selectedIds,
    toggleSelectedId,
    handleAddSelected,
  } = useQuickCreateProduct({ onClose, onCreated, supplierId })

  if (step === 'pick') {
    return (
      <PickerStep
        open={open}
        createdVariants={createdVariants}
        selectedIds={selectedIds}
        onToggle={toggleSelectedId}
        onAddSelected={handleAddSelected}
        onClose={handleClose}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Create Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <FormField label="Product Name" error={errors.productName} required>
            <Input value={productName} onChange={e => setProductName(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Category" error={errors.categoryId} required>
            <CategorySelect value={categoryId} onChange={setCategoryId} error={errors.categoryId} required />
          </FormField>
          <FormField label="Supplier Link">
            <Input
              type="url"
              value={supplierLink}
              onChange={e => setSupplierLink(e.target.value)}
              placeholder="https://..."
            />
          </FormField>

          {!supplierId && (
            <FormField label="Supplier">
              <Select
                value={chosenSupplierId || 'none'}
                onValueChange={val => setChosenSupplierId(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="No supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <div>
            <p className="text-xs font-medium mb-1">Product Photo</p>
            {productPhotoPreview ? (
              <div className="relative w-16 h-16 rounded-md border overflow-hidden">
                <img src={productPhotoPreview} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleClearProductPhoto}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-muted-foreground hover:text-primary">
                <ImagePlus className="w-5 h-5" />
                <input
                  ref={productPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProductPhotoSelect}
                />
              </label>
            )}
          </div>

          <DimensionSection
            dimensionRows={dimensionRows}
            errors={errors}
            skuError={skuError}
            onAddRow={addDimensionRow}
            onRemoveRow={removeDimensionRow}
            onUpdateName={updateDimensionName}
            onUpdateInputValue={updateDimensionInputValue}
            onAddValue={addValueToDimension}
            onRemoveValue={removeValueFromDimension}
            onUpdateValueCode={updateValueCode}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create & Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
