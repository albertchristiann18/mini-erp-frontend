import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'

export interface TerapkanRowProps {
  colSpan: number
  onApply: (price: number) => void
}

export function TerapkanRow({ colSpan, onApply }: TerapkanRowProps) {
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
