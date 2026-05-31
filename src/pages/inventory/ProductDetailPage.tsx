import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProduct } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ArrowLeft, Pencil, Tag } from 'lucide-react'
import { ProductFormModal } from '../../components/modals/ProductFormModal'
import { PriceChangeModal } from '../../components/modals/PriceChangeModal'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)

  const { data: product, isLoading } = useProduct(id!)

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  if (!product) {
    return <div className="p-8 text-center text-muted-foreground">Product not found</div>
  }

  const variants = product.variants ?? []
  const photos = product.photos ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <Badge variant={product.is_active ? 'success' : 'secondary'}>
          {product.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant="outline" className="font-mono">{product.sku_code}</Badge>
        {user?.is_staff && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowPriceModal(true)}>
              <Tag className="h-4 w-4 mr-1" /> Edit Prices
            </Button>
            <Button className="ml-auto" size="sm" onClick={() => setShowEditModal(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Product Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{product.category_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="font-medium">{product.total_qty ?? 0}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{product.description || '—'}</p>
              </div>
              {(product.weight || product.length || product.width || product.height) && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Dimensions / Weight</p>
                  <p className="text-sm">
                    {product.length && product.width && product.height
                      ? `${product.length} x ${product.width} x ${product.height} mm`
                      : '—'}
                    {product.weight ? ` / ${product.weight} g` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Variants</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Total Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No variants
                    </TableCell>
                  </TableRow>
                ) : variants.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="font-mono text-xs">{v.sku_variant_code}</TableCell>
                    <TableCell className="text-right">{(v.base_price / 100).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</TableCell>
                    <TableCell className="text-right">{v.total_available_qty ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={v.is_active ? 'success' : 'secondary'}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Photos</h2>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                    {photo.image_url ? (
                      <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Marketplace Listings</h2>
            </div>
            <div className="p-4">
              {variants.some(v => v.marketplace_listings && v.marketplace_listings.length > 0) ? (
                <div className="space-y-4">
                  {variants.filter(v => v.marketplace_listings && v.marketplace_listings.length > 0).map(v => (
                    <div key={v.id}>
                      <p className="text-sm font-medium mb-2">{v.name}</p>
                      {v.marketplace_listings?.map(listing => (
                        <div key={listing.marketplace_id} className="text-sm text-muted-foreground pl-2">
                          {listing.marketplace_id}: {(listing.selling_price / 100).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          {listing.discounted_price ? ` (${(listing.discounted_price / 100).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })})` : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No marketplace listings</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProductFormModal open={showEditModal} onClose={() => setShowEditModal(false)} product={product} />
      <PriceChangeModal open={showPriceModal} onClose={() => setShowPriceModal(false)} product={product} />
    </div>
  )
}