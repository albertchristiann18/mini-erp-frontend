import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { useBulkCreateProducts } from '../../hooks/useInventory'
import { toast } from '../../lib/toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function BulkProductModal({ open, onClose }: Props) {
  const [jsonInput, setJsonInput] = useState('')
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null)
  const bulkMutation = useBulkCreateProducts()

  const handleClose = () => {
    setJsonInput('')
    setResult(null)
    onClose()
  }

  const handleSubmit = async () => {
    try {
      const data = JSON.parse(jsonInput)
      if (!Array.isArray(data)) {
        toast.error('Input must be a JSON array')
        return
      }
      const res = await bulkMutation.mutateAsync(data)
      setResult({ created: res.data?.created ?? 0, errors: res.data?.errors ?? [] })
      toast.success(`Created ${res.data?.created ?? 0} products`)
    } catch (e) {
      toast.error('Invalid JSON or failed to create')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste a JSON array of products. Each product should have: name, sku, category_id, description, variants.
          </p>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[
  {
    "name": "Product 1",
    "sku": "SKU001",
    "category_id": "...",
    "description": "Description here",
    "variants": [...]
  }
]'
            className="min-h-[200px] font-mono text-xs"
          />
          {result && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Created: {result.created}</p>
              {result.errors.length > 0 && (
                <ul className="text-sm text-red-500 mt-1">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={bulkMutation.isPending}>
            {bulkMutation.isPending ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}