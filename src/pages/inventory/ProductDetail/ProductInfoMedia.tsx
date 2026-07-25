import type { Product, ProductPhoto } from '../../../types/inventory'

export interface ProductInfoMediaProps {
  product: Product
  photos: ProductPhoto[]
}

export function ProductInfoMedia({ product, photos }: ProductInfoMediaProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left — Product Information */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b font-semibold">Product Information</div>
        <div className="p-4 space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Brand: </span>
            {product.specifications?.Merek ?? product.specifications?.Brand ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Weight: </span>
            {product.weight ? `${product.weight} gram` : '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Dimension: </span>
            {product.length && product.width && product.height
              ? `${product.length} × ${product.width} × ${product.height} cm`
              : '—'}
          </div>
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
  )
}
