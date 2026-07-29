import { DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'

interface DownloadStepProps {
  isDownloading: boolean
  onDownload: () => void
  onCancel: () => void
  onNext: () => void
}

export function DownloadStep({ isDownloading, onDownload, onCancel, onNext }: DownloadStepProps) {
  return (
    <>
      <p>Download the Excel template, fill in your supplier's catalogue, then upload it here.</p>
      <p className="text-xs text-muted-foreground">
        Columns: variant_code (optional), product_name, dim1_key, dim1_value, dim2_key, dim2_value,
        category_code, unit_price, discounted_price, order_qty, supplier_link, image_url, notes
      </p>
      <Button onClick={onDownload} disabled={isDownloading}>
        {isDownloading ? 'Downloading...' : 'Download Template'}
      </Button>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onNext}>I've filled it in →</Button>
      </DialogFooter>
    </>
  )
}
