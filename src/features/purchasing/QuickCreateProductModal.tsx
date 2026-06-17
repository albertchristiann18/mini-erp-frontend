import { useState, useRef } from 'react'
import { ImagePlus, X, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { CategorySelect } from '../../components/ui/CategorySelect'
import { useCreateProduct, useSuppliers } from '../../hooks/useInventory'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useAuth } from '../../contexts/AuthContext'
import { uploadProductPhoto } from '../../api/inventory'
import { toast } from '../../lib/toast'

type DimensionRow = {
  name: string
  values: string
}

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]],
  )
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
  const { data: suppliersData } = useSuppliers({ active_only: 'true' })
  const supplierOptions = suppliersData?.results ?? []

  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierLink, setSupplierLink] = useState('')
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState<string | null>(null)
  const [dimensionRows, setDimensionRows] = useState<DimensionRow[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [step, setStep] = useState<'form' | 'pick'>('form')
  const [createdVariants, setCreatedVariants] = useState<CreatedVariant[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [chosenSupplierId, setChosenSupplierId] = useState('')
  const productPhotoInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setProductName('')
    setCategoryId('')
    setSupplierLink('')
    setProductPhoto(null)
    setProductPhotoPreview(null)
    setDimensionRows([])
    setErrors({})
    setStep('form')
    setCreatedVariants([])
    setSelectedIds(new Set())
    setChosenSupplierId('')
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

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!productName.trim()) errs.productName = 'Product name is required'
    if (!categoryId) errs.categoryId = 'Category is required'
    dimensionRows.forEach((d, i) => {
      if (!d.name.trim()) errs[`dim_${i}_name`] = 'Dimension name is required'
      if (!d.values.trim()) errs[`dim_${i}_values`] = 'At least one value required'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const description = `${productName.trim()} — added via Purchase Order. Update description from the Products page.`

      // Build variant_options from dimensions
      const variantOptions: Record<string, string[]> = {}
      for (const dim of dimensionRows) {
        const dimName = dim.name.trim()
        const dimVals = dim.values.split(',').map(v => v.trim()).filter(Boolean)
        if (dimName && dimVals.length > 0) {
          variantOptions[dimName] = dimVals
        }
      }

      // Build Cartesian product of all dimension values
      const dimEntries = Object.entries(variantOptions)
      let variantsPayload: Array<{ variant_values: Record<string, string>; sku_variant_code: string; base_price: 0 }> = []
      if (dimEntries.length > 0) {
        const combos = cartesian(dimEntries.map(([, vals]) => vals))
        variantsPayload = combos.map(combo => {
          const variantValues: Record<string, string> = {}
          dimEntries.forEach(([key], i) => { variantValues[key] = combo[i] })
          // Auto-generate SKU suffix from first 4 chars of each dimension value
          const skuSuffix = combo
            .map(v => v.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 4))
            .join('-')
          return { variant_values: variantValues, sku_variant_code: skuSuffix, base_price: 0 as const }
        })
      }

      const createPayload: Record<string, unknown> = {
        name: productName.trim(),
        category_id: categoryId,
        description,
        company_id: user?.company_id,
        weight: 0, length: 0, width: 0, height: 0,
        variant_options: variantOptions,
        variants: variantsPayload,
      }
      const effectiveSupplierId = supplierId || chosenSupplierId || null
      if (effectiveSupplierId) createPayload.supplier_id = effectiveSupplierId
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

      const supplierLinkVal = supplierLink.trim() || null
      const resultVariants: CreatedVariant[] = (created.variants ?? []).map(v => ({
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
                  {supplierOptions.map((s: { id: string; name: string }) => (
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
              <p className="text-xs font-medium">
                Variant Dimensions <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => setDimensionRows(prev => [...prev, { name: '', values: '' }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Dimension
              </Button>
            </div>

            {dimensionRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No dimensions — a Default variant will be created automatically.
              </p>
            ) : (
              <div className="space-y-2">
                {dimensionRows.map((dim, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-28 shrink-0">
                      <Input
                        value={dim.name}
                        onChange={e =>
                          setDimensionRows(prev =>
                            prev.map((d, i) => i === idx ? { ...d, name: e.target.value } : d),
                          )
                        }
                        placeholder="e.g. color"
                        className={`h-7 text-xs ${errors[`dim_${idx}_name`] ? 'border-destructive' : ''}`}
                      />
                      {errors[`dim_${idx}_name`] && (
                        <p className="text-xs text-destructive mt-0.5">{errors[`dim_${idx}_name`]}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Input
                        value={dim.values}
                        onChange={e =>
                          setDimensionRows(prev =>
                            prev.map((d, i) => i === idx ? { ...d, values: e.target.value } : d),
                          )
                        }
                        placeholder="e.g. Red, Blue, Green"
                        className={`h-7 text-xs ${errors[`dim_${idx}_values`] ? 'border-destructive' : ''}`}
                      />
                      {errors[`dim_${idx}_values`] && (
                        <p className="text-xs text-destructive mt-0.5">{errors[`dim_${idx}_values`]}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDimensionRows(prev => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive mt-1 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {/* Show count of combinations */}
                {dimensionRows.some(d => d.name.trim() && d.values.trim()) && (() => {
                  const count = dimensionRows
                    .filter(d => d.name.trim() && d.values.trim())
                    .reduce((acc, d) => acc * d.values.split(',').filter(v => v.trim()).length, 1)
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      → {count} variant{count !== 1 ? 's' : ''} will be created
                    </p>
                  )
                })()}
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
