import { useState } from 'react'
import { Plus, ArrowLeftRight } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { VariasiRow } from './VariasiRow'

export interface VariasiSetupSectionProps {
  dim1Key: string
  dim1Options: string[]
  dim2Key: string
  dim2Options: string[]
  showDim1: boolean
  showDim2: boolean
  hasDim1Stock: boolean
  hasDim2Stock: boolean
  onDim1KeyChange: (key: string) => void
  onDim1OptionsChange: (options: string[]) => void
  onDim2KeyChange: (key: string) => void
  onDim2OptionsChange: (options: string[]) => void
  onAddVariasi: (slot: 1 | 2) => void
  onRemoveDim1: () => void
  onRemoveDim2: () => void
  onSwapConfirmed: () => void
  onToastError: (msg: string) => void
}

export function VariasiSetupSection({
  dim1Key,
  dim1Options,
  dim2Key,
  dim2Options,
  showDim1,
  showDim2,
  hasDim1Stock,
  hasDim2Stock,
  onDim1KeyChange,
  onDim1OptionsChange,
  onDim2KeyChange,
  onDim2OptionsChange,
  onAddVariasi,
  onRemoveDim1,
  onRemoveDim2,
  onSwapConfirmed,
  onToastError,
}: VariasiSetupSectionProps) {
  const [showSwapDialog, setShowSwapDialog] = useState(false)

  const canSwap = showDim1 && showDim2 && dim1Key !== '' && dim2Key !== ''

  return (
    <div className="space-y-4">
      {showDim1 && (
        <VariasiRow
          slot={1}
          dimKey={dim1Key}
          options={dim1Options}
          hasDimStock={hasDim1Stock}
          onKeyChange={onDim1KeyChange}
          onOptionsChange={onDim1OptionsChange}
          onRemove={onRemoveDim1}
          onToastError={onToastError}
        />
      )}

      {canSwap && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSwapDialog(true)}
            className="gap-1.5 text-xs"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Tukar Variasi
          </Button>
        </div>
      )}

      {showDim2 && (
        <VariasiRow
          slot={2}
          dimKey={dim2Key}
          options={dim2Options}
          hasDimStock={hasDim2Stock}
          onKeyChange={onDim2KeyChange}
          onOptionsChange={onDim2OptionsChange}
          onRemove={onRemoveDim2}
          onToastError={onToastError}
        />
      )}

      {(!showDim1 || !showDim2) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddVariasi(showDim1 ? 2 : 1)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Variasi
        </Button>
      )}

      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tukar Variasi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tukar Variasi 1 ({dim1Key}) ↔ Variasi 2 ({dim2Key})? Foto variasi akan dikaitkan ke
            Variasi 1 yang baru.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                onSwapConfirmed()
                setShowSwapDialog(false)
              }}
            >
              Tukar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
