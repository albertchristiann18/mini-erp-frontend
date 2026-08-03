import React from 'react'
import { X } from 'lucide-react'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import type { DimensionImage } from '../../../types/inventory'
import type { VariantRow } from '../../../hooks/inventory/types'
import { Cell, HeaderCell } from './TableCells'
import { FotoCell } from './FotoCell'
import { TerapkanRow } from './TerapkanRow'

export interface DaftarVariasiTableProps {
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
