import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWarehouses, useCompanyMarketplaces } from '../../hooks/useInventory'
import { marketplaceReconcileStock } from '../../api/inventory'
import type { ReconcileResult } from '../../api/inventory'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { toast } from '../../lib/toast'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'

export default function MarketplaceReconcilePage() {
  const navigate = useNavigate()
  const { data: warehousesData } = useWarehouses()
  const { data: marketplacesData } = useCompanyMarketplaces()

  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [warehouseId, setWarehouseId] = useState('')
  const [marketplaceId, setMarketplaceId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<ReconcileResult | null>(null)
  const [resultData, setResultData] = useState<ReconcileResult | null>(null)
  const [notFoundOpen, setNotFoundOpen] = useState(false)

  const handlePreview = async () => {
    if (!file || !warehouseId) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('warehouse_id', warehouseId)
    if (marketplaceId) fd.append('marketplace_id', marketplaceId)
    fd.append('dry_run', 'true')
    setIsLoading(true)
    try {
      const res = await marketplaceReconcileStock(fd)
      setPreviewData(res.data)
      setStep('preview')
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to parse file'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!file || !warehouseId) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('warehouse_id', warehouseId)
    if (marketplaceId) fd.append('marketplace_id', marketplaceId)
    fd.append('dry_run', 'false')
    setIsLoading(true)
    try {
      const res = await marketplaceReconcileStock(fd)
      setResultData(res.data)
      setStep('result')
    } catch {
      toast.error('Failed to apply reconciliation')
    } finally {
      setIsLoading(false)
    }
  }

  const resetAll = () => {
    setStep('upload')
    setFile(null)
    setWarehouseId('')
    setMarketplaceId('')
    setPreviewData(null)
    setResultData(null)
    setNotFoundOpen(false)
  }

  const warehouses = warehousesData?.results ?? []
  const marketplaces = marketplacesData?.results ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/bulk-stock-update')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-semibold">Marketplace Stock Reconciliation</h1>
      </div>

      {step === 'upload' && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Marketplace (optional)</label>
            <Select value={marketplaceId} onValueChange={setMarketplaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select marketplace..." />
              </SelectTrigger>
              <SelectContent>
                {marketplaces.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Warehouse</label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="reconcile-file" className="text-sm font-medium text-foreground">Export File (.xlsx)</label>
            <input
              id="reconcile-file"
              type="file"
              accept=".xlsx"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
            />
          </div>

          <Button onClick={handlePreview} disabled={!file || !warehouseId || isLoading}>
            {isLoading ? 'Parsing...' : 'Preview Changes'}
          </Button>
        </div>
      )}

      {step === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="rounded-lg border bg-card p-4 flex-1">
              <p className="text-xs text-muted-foreground">Will adjust</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{previewData.summary.reconciled}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 flex-1">
              <p className="text-xs text-muted-foreground">No change</p>
              <p className="text-xl font-bold text-muted-foreground">{previewData.summary.skipped}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 flex-1">
              <p className="text-xs text-muted-foreground">Not found</p>
              <p className={`text-xl font-bold ${previewData.summary.not_found > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{previewData.summary.not_found}</p>
            </div>
          </div>

          {previewData.reconciled.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Reconciled Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">SKU</th>
                      <th className="p-2 text-right">Current Stock</th>
                      <th className="p-2 text-right">File Stock</th>
                      <th className="p-2 text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.reconciled.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-mono text-xs">{row.sku}</td>
                        <td className="p-2 text-right tabular-nums">{row.before}</td>
                        <td className="p-2 text-right tabular-nums">{row.after}</td>
                        <td className={`p-2 text-right tabular-nums font-medium ${(row.delta ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : (row.delta ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {(row.delta ?? 0) > 0 ? '+' : ''}{row.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewData.not_found.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <button
                onClick={() => setNotFoundOpen(!notFoundOpen)}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                {notFoundOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {previewData.not_found.length} SKUs not matched
              </button>
              {notFoundOpen && (
                <ul className="mt-2 space-y-1">
                  {previewData.not_found.map((sku, i) => (
                    <li key={i} className="text-xs font-mono text-muted-foreground">{sku}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('upload')} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Applying...' : 'Confirm & Apply'}
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && resultData && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Reconciliation complete</h2>
          <div className="space-y-1 text-sm">
            <p>Reconciled: {resultData.summary.reconciled} variants adjusted</p>
            <p>Skipped: {resultData.summary.skipped} variants unchanged</p>
            <p>Not found: {resultData.summary.not_found} SKUs unmatched</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetAll}>Reconcile Another File</Button>
            <Button onClick={() => navigate('/inventory/stock')}>Back to Stock</Button>
          </div>
        </div>
      )}
    </div>
  )
}
