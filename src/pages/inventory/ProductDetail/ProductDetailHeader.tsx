import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { ArrowLeft, Pencil } from 'lucide-react'
import type { Product } from '../../../types/inventory'

export interface ProductDetailHeaderProps {
  product: Product
  isStaff: boolean
  onBack: () => void
  onEdit: () => void
}

export function ProductDetailHeader({
  product,
  isStaff,
  onBack,
  onEdit,
}: ProductDetailHeaderProps) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="text-sm text-muted-foreground mb-1">Inventory &gt; Products</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <Badge variant={product.is_active ? 'success' : 'secondary'}>
            {product.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">{product.sku_code}</Badge>
        </div>
        {isStaff && (
          <Button size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Edit Product
          </Button>
        )}
      </div>
    </div>
  )
}
