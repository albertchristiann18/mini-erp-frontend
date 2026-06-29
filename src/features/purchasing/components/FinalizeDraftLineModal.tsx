import { useState, useEffect } from 'react'
import type { AxiosError } from 'axios'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { useCategories } from '../../../hooks/useInventory'
import { useFinalizeDraftLine } from '../hooks/useSourcingPool'
import { toast } from '../../../lib/toast'
import type { PurchaseOrderDetail } from '../../../types/purchasing'

interface DimInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}

function DimInput({ id, label, value, onChange, placeholder }: DimInputProps) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    </div>
  )
}

interface FinalizeDraftLineModalProps {
  open: boolean
  onClose: () => void
  poId: string
  detail: PurchaseOrderDetail
}

export function FinalizeDraftLineModal({ open, onClose, poId, detail }: FinalizeDraftLineModalProps) {
  const finalizeMutation = useFinalizeDraftLine()
  const [productName, setProductName] = useState(detail.draft_product_name)
  const [skuSuffix, setSkuSuffix] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [dim1Key, setDim1Key] = useState('')
  const [dim1Value, setDim1Value] = useState('')
  const [dim2Key, setDim2Key] = useState('')
  const [dim2Value, setDim2Value] = useState('')

  const isUnnamed = detail.draft_product_name.startsWith('(Unnamed)')

  useEffect(() => {
    if (open) {
      setProductName(isUnnamed ? '' : detail.draft_product_name)
      setSkuSuffix('')
      setCategoryId('')
      setFieldError('')
      setDim1Key('')
      setDim1Value('')
      setDim2Key('')
      setDim2Value('')
    }
  }, [open, detail.id])

  const { data: categoriesData } = useCategories({ page_size: 200, is_active: 'true' })
  const categories = categoriesData?.results ?? []

  const handleSubmit = async () => {
    if (isUnnamed && !productName.trim()) {
      setFieldError('Product name is required')
      return
    }
    if (!skuSuffix.trim()) {
      setFieldError('SKU suffix is required')
      return
    }
    setFieldError('')
    try {
      await finalizeMutation.mutateAsync({
        poId,
        detailId: detail.id,
        sku_suffix: skuSuffix.trim(),
        category_id: categoryId || null,
        product_name: productName.trim() || undefined,
        dim1_key: dim1Key.trim() || undefined,
        dim1_value: dim1Value.trim() || undefined,
        dim2_key: dim2Key.trim() || undefined,
        dim2_value: dim2Value.trim() || undefined,
      })
      toast.success(`Finalized: ${productName || detail.draft_product_name}`)
      onClose()
    } catch (err: unknown) {
      const apiError = (err as AxiosError<{ error?: string }>).response?.data?.error
      setFieldError(apiError ?? 'Failed to finalize — please try again')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize Draft Line</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preview box */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
            {detail.product_photo_url ? (
              <img
                src={detail.product_photo_url}
                alt=""
                className="h-12 w-12 rounded object-cover shrink-0 border border-border"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-muted shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sourcing pool item</p>
              <p className="font-medium text-sm leading-tight">{detail.draft_product_name}</p>
              {detail.product_variant_name && (
                <p className="text-xs text-muted-foreground">{detail.product_variant_name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {detail.ordered_qty} units
                {detail.unit_price_foreign != null && ` · ${detail.unit_price_foreign}`}
              </p>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label htmlFor="finalize-product-name" className="text-xs text-muted-foreground mb-1 block">
              Product Name{isUnnamed && <span className="text-red-500"> *</span>}
            </label>
            <Input
              id="finalize-product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name..."
              className="text-sm"
            />
          </div>

          {/* SKU Suffix — required */}
          <div>
            <label htmlFor="finalize-sku-suffix" className="text-xs text-muted-foreground mb-1 block">
              SKU Suffix <span className="text-red-500">*</span>
            </label>
            <Input
              id="finalize-sku-suffix"
              value={skuSuffix}
              onChange={(e) => { setSkuSuffix(e.target.value); setFieldError('') }}
              placeholder="e.g. RED-L"
              className="text-sm font-mono"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Appended to the category code to form the final SKU.
            </p>
          </div>

          {/* Category — optional */}
          <div>
            <label htmlFor="finalize-category" className="text-xs text-muted-foreground mb-1 block">
              Category (optional)
            </label>
            <Select
              value={categoryId || 'none'}
              onValueChange={(val) => setCategoryId(val === 'none' ? '' : val)}
            >
              <SelectTrigger id="finalize-category" className="text-sm">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.category_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variasi (optional) */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Dimensi Variasi (opsional)</p>
            <div className="grid grid-cols-2 gap-2">
              <DimInput id="finalize-dim1-key" label="Variasi 1 — Nama" value={dim1Key} onChange={setDim1Key} placeholder="e.g. Warna" />
              <DimInput id="finalize-dim1-value" label="Variasi 1 — Nilai" value={dim1Value} onChange={setDim1Value} placeholder="e.g. Putih" />
              <DimInput id="finalize-dim2-key" label="Variasi 2 — Nama" value={dim2Key} onChange={setDim2Key} placeholder="e.g. Ukuran" />
              <DimInput id="finalize-dim2-value" label="Variasi 2 — Nilai" value={dim2Value} onChange={setDim2Value} placeholder="e.g. M" />
            </div>
          </div>

          {fieldError && (
            <p className="text-sm text-destructive" role="alert">{fieldError}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={finalizeMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={finalizeMutation.isPending}>
            {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
