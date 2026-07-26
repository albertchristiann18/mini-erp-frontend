import { Upload, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import type { Warehouse, CompanyMarketplace } from '../../../types/inventory'

interface UploadStepProps {
  file: File | null
  marketplaceId: string
  warehouseId: string
  marketplaces: Pick<CompanyMarketplace, 'id' | 'name'>[]
  warehouses: Pick<Warehouse, 'id' | 'name'>[]
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFileClear: () => void
  onMarketplaceChange: (id: string) => void
  onWarehouseChange: (id: string) => void
}

export function UploadStep({
  file,
  marketplaceId,
  warehouseId,
  marketplaces,
  warehouses,
  onFileChange,
  onFileClear,
  onMarketplaceChange,
  onWarehouseChange,
}: UploadStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Step 1 of 4</p>

      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
        Pastikan kolom 'Nomor Referensi SKU' sudah diisi di Shopee Seller Center sebelum import.
        SKU yang tidak ditemukan harus dipetakan manual.
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Marketplace</label>
        <Select value={marketplaceId} onValueChange={onMarketplaceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select marketplace..." />
          </SelectTrigger>
          <SelectContent>
            {marketplaces.map(mp => (
              <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Warehouse</label>
        <Select value={warehouseId} onValueChange={onWarehouseChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select warehouse..." />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map(wh => (
              <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">File</label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded p-6 cursor-pointer hover:border-primary transition-colors">
          {file ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">{file.name}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onFileClear() }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-sm text-muted-foreground">Click to select .xlsx file</span>
            </>
          )}
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            data-testid="file-input"
            onChange={onFileChange}
          />
        </label>
      </div>
    </div>
  )
}
