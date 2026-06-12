import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProduct, useSaveVariants, useProductSuppliers, useProductBusinessEntities, useAttachBusinessEntity, useDetachBusinessEntity, useBusinessEntities } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { ArrowLeft, Pencil, Tag, Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import type { VariantDimension } from '../../types/inventory'
import type { SaveVariantsPayload } from '../../api/inventory'
import { toast } from '../../lib/toast'

function getDimLabel(dim: VariantDimension, valueId: string | undefined): string {
  if (!valueId) return '—'
  return dim.values.find(v => v.id === valueId)?.label ?? valueId
}

function fmtNum(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString('id-ID')
}

export default function ProductDetailPage() {
  const [editingPrices, setEditingPrices] = useState(false)
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
  const [isSavingPrices, setIsSavingPrices] = useState(false)

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: product, isLoading } = useProduct(id!)
  const saveMutation = useSaveVariants(id!)
  const { data: productSuppliersData } = useProductSuppliers(id!)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachingId, setAttachingId] = useState('')
  const { data: productBEData } = useProductBusinessEntities(id!)
  const attachMutation = useAttachBusinessEntity(id!)
  const detachMutation = useDetachBusinessEntity(id!)
  const { data: allBEData } = useBusinessEntities({ page_size: 100, is_active: 'true' })

  const variants = product?.variants ?? []
  const photos = product?.photos ?? []
  const rawOpts = product?.variant_options as Record<string, string[]> | undefined
  const dims: VariantDimension[] = rawOpts
    ? Object.entries(rawOpts).map(([name, values], idx) => ({
        id: name,
        name,
        order: idx + 1,
        values: (values ?? []).map(v => ({ id: v, label: v })),
      }))
    : []

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
      qc.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Prices saved')
      setEditingPrices(false)
      setEditedPrices({})
    } catch {
      toast.error('Failed to save prices')
    } finally {
      setIsSavingPrices(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  if (!product) {
    return <div className="p-8 text-center text-muted-foreground">Product not found</div>
  }

  const assignments = productBEData?.results ?? []
  const attachedMarketplaceIds = new Set(assignments.map(a => a.marketplace_id))
  const availableBEs = (allBEData?.results ?? []).filter(be => be.is_active)

  const activeVariants = variants.filter(v => v.is_active)
  const marketplaceIds = [...new Set(
    variants.flatMap(v => (v.marketplace_listings ?? []).map(l => l.marketplace_id))
  )]

  return (
    <div className="space-y-6">
      {/* A. HEADER CARD */}
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm text-muted-foreground mb-1">Inventory &gt; Products</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/products')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Badge variant={product.is_active ? 'success' : 'secondary'}>
              {product.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">{product.sku_code}</Badge>
          </div>
          {user?.is_staff && (
            <Button size="sm" onClick={() => navigate(`/inventory/products/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit Product
            </Button>
          )}
        </div>
      </div>

      {/* B. TWO-COLUMN ROW */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left — Product Information */}
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b font-semibold">Product Information</div>
          <div className="p-4 space-y-3 text-sm">
            <div><span className="text-muted-foreground">Brand: </span>
              {product.specifications?.Merek ?? product.specifications?.Brand ?? '—'}</div>
            <div><span className="text-muted-foreground">Weight: </span>
              {product.weight ? `${product.weight} gram` : '—'}</div>
            <div><span className="text-muted-foreground">Dimension: </span>
              {product.length && product.width && product.height
                ? `${product.length} × ${product.width} × ${product.height} cm`
                : '—'}</div>
            {product.description && (
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1 whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Product Media */}
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b font-semibold">Product Media</div>
          <div className="p-4">
            {photos.length === 0 ? (
              <div className="h-32 flex items-center justify-center bg-muted/30 rounded text-sm text-muted-foreground">
                No photos
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded overflow-hidden bg-muted">
                    {photo.image_url
                      ? <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* D. MARKETPLACE INTEGRATION */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b font-semibold">Marketplace Integration</div>
        <div className="p-4">
          {marketplaceIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No marketplace listings</p>
          ) : (
            <div className="space-y-2">
              {marketplaceIds.map(mid => (
                <div key={mid} className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{mid}</span>
                  <span className="text-green-600">Connected ✓</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* D2. SUPPLIERS */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b font-semibold">Suppliers</div>
        <div className="p-4">
          {(productSuppliersData?.results ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers linked</p>
          ) : (
            <div className="space-y-2">
              {(productSuppliersData?.results ?? []).map(ps => (
                <div key={ps.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{ps.supplier_name}</span>
                  {ps.supplier_link ? (
                    <a
                      href={ps.supplier_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs truncate max-w-[260px]"
                    >
                      {ps.supplier_link}
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">No link</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* D3. BUSINESS ENTITIES */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-semibold">Business Entities</span>
          {user?.is_staff && (
            <Button size="sm" variant="outline" onClick={() => setShowAttachModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Attach
            </Button>
          )}
        </div>
        <div className="p-4">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No business entities attached</p>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.business_entity_name}</span>
                    <Badge variant="outline" className="text-xs">{a.marketplace_name}</Badge>
                  </div>
                  {user?.is_staff && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => detachMutation.mutate(a.id, {
                        onSuccess: () => toast.success('Detached'),
                        onError: () => toast.error('Failed to detach'),
                      })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach Business Entity</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={attachingId} onValueChange={setAttachingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a business entity" />
              </SelectTrigger>
              <SelectContent>
                {availableBEs.map(be => {
                  const disabled = attachedMarketplaceIds.has(be.marketplace_id)
                  return (
                    <SelectItem key={be.id} value={be.id} disabled={disabled}>
                      {be.name} ({be.marketplace_name})
                      {disabled ? ' (marketplace already attached)' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachModal(false)}>Cancel</Button>
            <Button
              disabled={!attachingId}
              onClick={() => {
                attachMutation.mutate(attachingId, {
                  onSuccess: () => { toast.success('Attached'); setShowAttachModal(false); setAttachingId('') },
                  onError: (err) => toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to attach'),
                })
              }}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* E. VARIANT DETAIL GRID */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Variant Detail</h2>
          {user?.is_staff && (
            editingPrices ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSavePrices} disabled={isSavingPrices}>
                  <Tag className="h-4 w-4 mr-1" />
                  {isSavingPrices ? 'Saving...' : 'Save Prices'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelPrices}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleStartEditPrices}>
                <Tag className="h-4 w-4 mr-1" /> Edit Prices
              </Button>
            )
          )}
        </div>

        {activeVariants.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No variants</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {dims.map(d => (
                    <th key={d.id} className="text-left px-4 py-3 font-medium">{d.name}</th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-right px-4 py-3 font-medium">Cost (COGS)</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeVariants.map(v => (
                  <tr key={v.id}>
                    {dims.map(d => (
                      <td key={d.id} className="px-4 py-3 font-medium">
                        {getDimLabel(d, v.variant_values?.[d.id])}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-mono text-xs">{v.sku_variant_code}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {fmtNum(v.current_cogs)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingPrices ? (
                        <Input
                          type="number"
                          min="0"
                          value={editedPrices[v.id] ?? v.base_price}
                          onChange={e =>
                            setEditedPrices(prev => ({
                              ...prev,
                              [v.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="h-8 w-32 text-right ml-auto"
                        />
                      ) : (
                        fmtNum(v.base_price)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.total_available_qty ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
