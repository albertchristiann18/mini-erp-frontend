import React, { useState } from 'react'
import { X, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import type { DimensionImage } from '../../types/inventory'
import type { VariantRow } from '../../hooks/inventory/types'

function Cell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2 text-sm align-middle', className)}>{children}</td>
}

function HeaderCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-3 py-2 text-sm font-medium text-left text-muted-foreground whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

interface FotoCellProps {
  photoUrl: string | null
  rowSpan: number
  isEditing: boolean
  onUpload: (file: File) => Promise<void>
  onDelete: () => Promise<void>
}

function FotoCell({ photoUrl, rowSpan, isEditing, onUpload, onDelete }: FotoCellProps) {
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setLoading(true)
      await onUpload(file)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      await onDelete()
    } finally {
      setLoading(false)
    }
  }

  return (
    <td rowSpan={rowSpan} className="px-2 py-2 align-top w-16">
      {isEditing ? (
        <div className="flex flex-col items-center gap-1">
          <label className="cursor-pointer flex flex-col items-center justify-center w-14 h-14 rounded border border-dashed border-border hover:border-primary transition-colors relative overflow-hidden">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover rounded" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
          </label>
          {photoUrl && !loading && (
            <button type="button" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="w-14 h-14 rounded border border-dashed border-border bg-muted/30" />
      )}
    </td>
  )
}

interface TerapkanRowProps {
  colSpan: number
  onApply: (price: number) => void
}

function TerapkanRow({ colSpan, onApply }: TerapkanRowProps) {
  const [priceInput, setPriceInput] = useState('')

  const handleApply = () => {
    const price = parseInt(priceInput, 10)
    if (!isNaN(price) && price >= 0) {
      onApply(price)
      setPriceInput('')
    }
  }

  return (
    <tr className="bg-muted/20 border-t border-dashed">
      <td colSpan={colSpan} className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Terapkan ke semua:</span>
          <span>Harga</span>
          <Input
            type="number"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleApply() }
            }}
            className="h-7 w-28 text-xs"
            placeholder="0"
          />
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleApply}>
            Terapkan
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface DaftarVariasiTableProps {
  dim1Key: string
  dim2Key: string
  dim1Options: string[]
  dim2Options: string[]
  rows: VariantRow[]
  dimensionImages: DimensionImage[]
  isEditing: boolean
  onRowChange: (globalIdx: number, field: 'sku_variant_code' | 'base_price', value: string | number) => void
  onRemoveRow: (globalIdx: number) => void
  onBulkFillPrice: (price: number) => void
  onDimensionImageUpload: (dimKey: string, dimValue: string, file: File) => Promise<void>
  onDimensionImageDelete: (dimKey: string, dimValue: string) => Promise<void>
}

interface IndexedRow {
  row: VariantRow
  globalIdx: number
}

interface Group {
  dim1Value: string
  rows: IndexedRow[]
  isOrphaned: boolean
}

export function DaftarVariasiTable({
  dim1Key,
  dim2Key,
  dim1Options,
  dim2Options,
  rows,
  dimensionImages,
  isEditing,
  onRowChange,
  onRemoveRow,
  onBulkFillPrice,
  onDimensionImageUpload,
  onDimensionImageDelete,
}: DaftarVariasiTableProps) {
  const activeRows: IndexedRow[] = rows
    .map((row, globalIdx) => ({ row, globalIdx }))
    .filter(({ row }) => !row.removed)

  if (!dim1Key || (dim1Options.length === 0 && activeRows.length === 0)) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Belum ada variasi. Tambah opsi Variasi 1 di atas untuk memulai.
      </div>
    )
  }

  const hasDim2 = !!dim2Key && dim2Options.length > 0

  const grouped: Group[] = dim1Options.map((dim1Value) => {
    let groupRows = activeRows.filter(({ row }) => row.variantValues[dim1Key] === dim1Value)
    if (hasDim2) {
      groupRows = groupRows.sort((a, b) => {
        const ai = dim2Options.indexOf(a.row.variantValues[dim2Key] ?? '')
        const bi = dim2Options.indexOf(b.row.variantValues[dim2Key] ?? '')
        const ai2 = ai === -1 ? Infinity : ai
        const bi2 = bi === -1 ? Infinity : bi
        return ai2 - bi2
      })
    }
    return { dim1Value, rows: groupRows, isOrphaned: false }
  })

  const knownDim1Values = new Set(dim1Options)
  const orphanedByDim1 = new Map<string, IndexedRow[]>()
  for (const indexed of activeRows) {
    const val = indexed.row.variantValues[dim1Key] ?? ''
    if (!knownDim1Values.has(val)) {
      if (!orphanedByDim1.has(val)) orphanedByDim1.set(val, [])
      orphanedByDim1.get(val)!.push(indexed)
    }
  }
  for (const [dim1Value, orphanRows] of orphanedByDim1) {
    grouped.push({ dim1Value, rows: orphanRows, isOrphaned: true })
  }

  const dataCols = (hasDim2 ? 1 : 0) + 1 + 1 + 1 + 1
  const terapkanColSpan = dataCols

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {isEditing && <HeaderCell>Foto</HeaderCell>}
            <HeaderCell>{dim1Key}</HeaderCell>
            {hasDim2 && <HeaderCell>{dim2Key}</HeaderCell>}
            <HeaderCell>SKU</HeaderCell>
            <HeaderCell>Harga</HeaderCell>
            <HeaderCell>Stok</HeaderCell>
            <HeaderCell>Aksi</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {isEditing && (
            <TerapkanRow
              colSpan={terapkanColSpan + (isEditing ? 1 : 0) + 1}
              onApply={(price) => onBulkFillPrice(price)}
            />
          )}
          {grouped.map(({ dim1Value, rows: groupRows, isOrphaned }) => {
            if (groupRows.length === 0) return null

            const photoUrl =
              dimensionImages.find(
                (di) => di.dim_key === dim1Key && di.dim_value === dim1Value,
              )?.photo_url ?? null

            return (
              <React.Fragment key={dim1Value}>
                {groupRows.map(({ row, globalIdx }, rowIdx) => (
                  <tr key={globalIdx} className="border-b hover:bg-muted/20">
                    {rowIdx === 0 && isEditing && (
                      <FotoCell
                        photoUrl={photoUrl}
                        rowSpan={groupRows.length}
                        isEditing={isEditing}
                        onUpload={(file) => onDimensionImageUpload(dim1Key, dim1Value, file)}
                        onDelete={() => onDimensionImageDelete(dim1Key, dim1Value)}
                      />
                    )}
                    {rowIdx === 0 && (
                      <td rowSpan={groupRows.length} className="px-3 py-2 text-sm font-medium whitespace-nowrap align-top pt-3">
                        {isOrphaned && <span className="text-amber-500 mr-1">⚠</span>}
                        {dim1Value || '—'}
                      </td>
                    )}
                    {hasDim2 && (
                      <Cell className="whitespace-nowrap text-muted-foreground">
                        {row.variantValues[dim2Key] ?? '—'}
                      </Cell>
                    )}
                    <Cell>
                      <Input
                        value={row.sku_variant_code}
                        onChange={(e) => onRowChange(globalIdx, 'sku_variant_code', e.target.value)}
                        className="h-7 text-xs font-mono w-40"
                      />
                    </Cell>
                    <Cell>
                      <Input
                        type="number"
                        min={0}
                        value={row.base_price}
                        onChange={(e) => onRowChange(globalIdx, 'base_price', Number(e.target.value))}
                        className="h-7 text-xs w-24"
                      />
                    </Cell>
                    <Cell className="text-right tabular-nums">
                      {row.total_available_qty}
                    </Cell>
                    <Cell>
                      {row.hasStock ? (
                        <Badge variant="secondary" className="text-xs">
                          {row.total_available_qty === 0 ? 'Ada riwayat' : 'Ada stok'}
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveRow(globalIdx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </Cell>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
