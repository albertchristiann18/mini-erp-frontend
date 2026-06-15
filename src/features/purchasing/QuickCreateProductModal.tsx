import { useState, useRef } from 'react'
import { ImagePlus, X, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { CategorySelect } from '../../components/ui/CategorySelect'
import { useCreateProduct } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { uploadProductPhoto, uploadVariantPhoto } from '../../api/inventory'
import { toast } from '../../lib/toast'

interface VariantRow {
  name: string
  skuSuffix: string
  photo: File | null
  photoPreview: string | null
}

interface CreatedVariant {
  id: string
  label: string
  productId: string
  productName: string
  productSupplierLink: string | null
  productPhotoUrl: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (variants: CreatedVariant[]) => void
  supplierId?: string
}

export function QuickCreateProductModal({ open, onClose, onCreated, supplierId }: Props) {
  const { user } = useAuth()
  const createProductMutation = useCreateProduct()

  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierLink, setSupplierLink] = useState('')
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState<string | null>(null)
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [step, setStep] = useState<'form' | 'pick'>('form')
  const [createdVariants, setCreatedVariants] = useState<CreatedVariant[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const productPhotoInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setProductName('')
    setCategoryId('')
    setSupplierLink('')
    setProductPhoto(null)
    setProductPhotoPreview(null)
    setVariantRows([])
    setErrors({})
    setStep('form')
    setCreatedVariants([])
    setSelectedIds(new Set())
    onClose()
  }

  const handleProductPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProductPhoto(file)
    setProductPhotoPreview(URL.createObjectURL(file))
  }

  const handleClearProductPhoto = () => {
    setProductPhoto(null)
    setProductPhotoPreview(null)
    if (productPhotoInputRef.current) productPhotoInputRef.current.value = ''
  }

  const addVariantRow = () =>
    setVariantRows(prev => [...prev, { name: '', skuSuffix: '', photo: null, photoPreview: null }])

  const removeVariantRow = (idx: number) =>
    setVariantRows(prev => prev.filter((_, i) => i !== idx))

  const handleVariantPhoto = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVariantRows(prev =>
      prev.map((r, i) =>
        i === idx ? { ...r, photo: file, photoPreview: URL.createObjectURL(file) } : r,
      ),
    )
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!productName.trim()) errs.productName = 'Product name is required'
    if (!categoryId) errs.categoryId = 'Category is required'
    variantRows.forEach((r, i) => {
      if (!r.name.trim()) errs[`variant_${i}_name`] = 'Variant name is required'
      if (!r.skuSuffix.trim()) errs[`variant_${i}_sku`] = 'SKU suffix is required'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const description = `${productName.trim()} — added via Purchase Order. Update description from the Products page.`

      const createPayload: Record<string, unknown> = {
        name: productName.trim(),
        category_id: categoryId,
        description,
        company_id: user?.company_id,
        weight: 0,
        length: 0,
        width: 0,
        height: 0,
        variant_options: variantRows.length > 0 ? { Variant: variantRows.map(r => r.name.trim()) } : {},
        variants: variantRows.map(r => ({
          variant_values: variantRows.length > 0 ? { Variant: r.name.trim() } : {},
          sku_variant_code: r.skuSuffix.trim().toUpperCase(),
          base_price: 0,
        })),
      }
      if (supplierId) createPayload.supplier_id = supplierId
      if (supplierLink.trim()) createPayload.supplier_link = supplierLink.trim()

      const created = await createProductMutation.mutateAsync(createPayload)
      const productId = created.id
      let finalPhotoUrl: string | null = null

      if (productPhoto) {
        try {
          const r = await uploadProductPhoto(productId, productPhoto)
          finalPhotoUrl = r.data.image_url
        } catch {
          toast.error('Product created but photo upload failed — add photo from Products page')
        }
      }

      for (let i = 0; i < created.variants.length; i++) {
        const variantDef = created.variants[i]
        const rowPhoto = variantRows[i]?.photo ?? null
        if (rowPhoto && variantDef) {
          try {
            await uploadVariantPhoto(productId, variantDef.id, rowPhoto)
          } catch {
            // Non-fatal: product is created, photo can be added later
          }
        }
      }

      const supplierLinkVal = supplierLink.trim() || null
      const resultVariants: CreatedVariant[] = created.variants.map(v => ({
        id: v.id,
        label: `${v.name} (${v.sku_variant_code})`,
        productId,
        productName: created.name,
        productSupplierLink: supplierLinkVal,
        productPhotoUrl: finalPhotoUrl,
      }))

      if (resultVariants.length <= 1) {
        onCreated(resultVariants)
        handleClose()
      } else {
        setCreatedVariants(resultVariants)
        setSelectedIds(new Set(resultVariants.map(v => v.id)))
        setStep('pick')
      }
    } catch {
      toast.error('Failed to create product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSelected = () => {
    const selected = createdVariants.filter(v => selectedIds.has(v.id))
    if (selected.length === 0) {
      toast.error('Select at least one variant')
      return
    }
    onCreated(selected)
    handleClose()
  }

  if (step === 'pick') {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose Variants to Add</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Select which variants to add as PO line items.</p>
          <div className="space-y-2 py-2">
            {createdVariants.map(v => (
              <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(v.id)}
                  onChange={e => {
                    setSelectedIds(prev => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(v.id)
                      else next.delete(v.id)
                      return next
                    })
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm">{v.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="button" onClick={handleAddSelected}>
              Add Selected ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <Input type="url" value={supplierLink} onChange={e => setSupplierLink(e.target.value)} placeholder="https://..." />
          </FormField>

          <div>
            <p className="text-xs font-medium mb-1">Product Photo</p>
            {productPhotoPreview ? (
              <div className="relative w-16 h-16 rounded-md border overflow-hidden">
                <img src={productPhotoPreview} className="w-full h-full object-cover" />
                <button type="button" onClick={handleClearProductPhoto}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-muted-foreground hover:text-primary">
                <ImagePlus className="w-5 h-5" />
                <input ref={productPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProductPhotoSelect} />
              </label>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">Variants <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
                <Plus className="h-3 w-3 mr-1" /> Add Variant
              </Button>
            </div>

            {variantRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No variants — a Default variant will be created automatically.</p>
            ) : (
              <div className="space-y-2">
                {variantRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <label className="w-8 h-8 rounded border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary shrink-0 overflow-hidden relative">
                      {row.photoPreview ? (
                        <img src={row.photoPreview} className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleVariantPhoto(idx, e)} />
                    </label>

                    <div className="flex-1">
                      <Input
                        value={row.name}
                        onChange={e => setVariantRows(prev => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                        placeholder="e.g. Blue / M"
                        className={`h-7 text-xs ${errors[`variant_${idx}_name`] ? 'border-destructive' : ''}`}
                      />
                      {errors[`variant_${idx}_name`] && <p className="text-xs text-destructive">{errors[`variant_${idx}_name`]}</p>}
                    </div>

                    <div className="w-24">
                      <Input
                        value={row.skuSuffix}
                        onChange={e => setVariantRows(prev => prev.map((r, i) => i === idx ? { ...r, skuSuffix: e.target.value } : r))}
                        placeholder="BLU-M"
                        className={`h-7 text-xs font-mono ${errors[`variant_${idx}_sku`] ? 'border-destructive' : ''}`}
                      />
                      {errors[`variant_${idx}_sku`] && <p className="text-xs text-destructive">{errors[`variant_${idx}_sku`]}</p>}
                    </div>

                    <button type="button" onClick={() => removeVariantRow(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
