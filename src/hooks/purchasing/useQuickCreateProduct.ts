import { useState, useRef } from 'react'
import { useCreateProduct, useSuppliers, useUploadAnyProductPhoto } from '../api/inventory'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../lib/toast'
import { isSkuConflictError, buildVariantsPayload, validateQuickCreateForm } from './quickCreateProductHelpers'
import type {
  DimensionRow,
  CreatedVariant,
  UseQuickCreateProductProps,
  UseQuickCreateProductResult,
} from './quickCreateProductHelpers'

export type { DimensionChip, DimensionRow, CreatedVariant, UseQuickCreateProductProps, UseQuickCreateProductResult } from './quickCreateProductHelpers'

export function useQuickCreateProduct({
  onClose,
  onCreated,
  supplierId,
}: UseQuickCreateProductProps): UseQuickCreateProductResult {
  const { user } = useAuth()
  const createProductMutation = useCreateProduct()
  const uploadPhotoMutation = useUploadAnyProductPhoto()
  const { data: suppliersData } = useSuppliers({ active_only: 'true' })
  const supplierOptions = suppliersData?.results ?? []

  // Simple field state
  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierLink, setSupplierLink] = useState('')
  const [chosenSupplierId, setChosenSupplierId] = useState('')

  // Photo state
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState<string | null>(null)
  const productPhotoInputRef = useRef<HTMLInputElement>(null)

  // Dimension row state
  const [dimensionRows, setDimensionRows] = useState<DimensionRow[]>([])

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [skuError, setSkuError] = useState<string | null>(null)

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Wizard step state
  const [step, setStep] = useState<'form' | 'pick'>('form')
  const [createdVariants, setCreatedVariants] = useState<CreatedVariant[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ─── Reset / Close ──────────────────────────────────────────────────────────

  const handleClose = () => {
    setProductName('')
    setCategoryId('')
    setSupplierLink('')
    setProductPhoto(null)
    setProductPhotoPreview(null)
    setDimensionRows([])
    setErrors({})
    setSkuError(null)
    setStep('form')
    setCreatedVariants([])
    setSelectedIds(new Set())
    setChosenSupplierId('')
    onClose()
  }

  // ─── Photo handlers ─────────────────────────────────────────────────────────

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

  // ─── Dimension row handlers ─────────────────────────────────────────────────

  const addDimensionRow = () => {
    setDimensionRows(prev => [
      ...prev,
      { id: String(Date.now()), name: '', values: [], inputValue: '' },
    ])
  }

  const removeDimensionRow = (idx: number) => {
    setDimensionRows(prev => prev.filter((_, i) => i !== idx))
  }

  const updateDimensionName = (idx: number, name: string) => {
    setDimensionRows(prev =>
      prev.map((d, i) => (i === idx ? { ...d, name } : d)),
    )
  }

  const updateDimensionInputValue = (idx: number, value: string) => {
    setDimensionRows(prev =>
      prev.map((d, i) => (i === idx ? { ...d, inputValue: value } : d)),
    )
  }

  const addValueToDimension = (idx: number) => {
    setDimensionRows(prev =>
      prev.map((d, i) => {
        if (i !== idx) return d
        const label = d.inputValue.trim()
        if (!label) return { ...d, inputValue: '' }
        if (d.values.some(v => v.label === label)) return { ...d, inputValue: '' }
        const code = label.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '')
        return { ...d, values: [...d.values, { label, code }], inputValue: '' }
      }),
    )
    setSkuError(null)
  }

  const removeValueFromDimension = (dimIdx: number, valIdx: number) => {
    setDimensionRows(prev =>
      prev.map((d, i) =>
        i !== dimIdx ? d : { ...d, values: d.values.filter((_, vi) => vi !== valIdx) },
      ),
    )
  }

  const updateValueCode = (dimIdx: number, valIdx: number, newCode: string) => {
    setDimensionRows(prev =>
      prev.map((d, i) =>
        i !== dimIdx
          ? d
          : {
              ...d,
              values: d.values.map((v, vi) =>
                vi !== valIdx
                  ? v
                  : { ...v, code: newCode.toUpperCase().replace(/[^A-Z0-9]/g, '') },
              ),
            },
      ),
    )
    setSkuError(null)
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs = validateQuickCreateForm(productName, categoryId, dimensionRows)
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const description = `${productName.trim()} — added via Purchase Order. Update description from the Products page.`
      const { variantOptions, variantsPayload } = buildVariantsPayload(dimensionRows)

      const createPayload: Record<string, unknown> = {
        name: productName.trim(),
        category_id: categoryId,
        description,
        company_id: user?.company_id,
        weight: 0,
        length: 0,
        width: 0,
        height: 0,
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
          const r = await uploadPhotoMutation.mutateAsync({ productId, image: productPhoto })
          finalPhotoUrl = r.image_url
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
    } catch (err: unknown) {
      if (isSkuConflictError(err)) {
        setSkuError(
          'Some variant codes already exist in the system. Update the codes on the chips above and try again.',
        )
      } else {
        toast.error('Failed to create product')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Picker step ────────────────────────────────────────────────────────────

  const toggleSelectedId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

  // ─── Return view-model ──────────────────────────────────────────────────────

  return {
    productName,
    setProductName,
    categoryId,
    setCategoryId,
    supplierLink,
    setSupplierLink,
    chosenSupplierId,
    setChosenSupplierId,
    productPhoto,
    productPhotoPreview,
    productPhotoInputRef,
    handleProductPhotoSelect,
    handleClearProductPhoto,
    dimensionRows,
    addDimensionRow,
    removeDimensionRow,
    updateDimensionName,
    updateDimensionInputValue,
    addValueToDimension,
    removeValueFromDimension,
    updateValueCode,
    errors,
    skuError,
    validate,
    isSubmitting,
    handleSubmit,
    step,
    createdVariants,
    selectedIds,
    toggleSelectedId,
    handleAddSelected,
    handleClose,
    supplierOptions,
  }
}
