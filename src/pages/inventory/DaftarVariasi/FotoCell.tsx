import React, { useState } from 'react'
import { X, ImagePlus, Loader2 } from 'lucide-react'

export interface FotoCellProps {
  photoUrl: string | null
  rowSpan: number
  isEditing: boolean
  onUpload: (file: File) => Promise<void>
  onDelete: () => Promise<void>
}

export function FotoCell({ photoUrl, rowSpan, isEditing, onUpload, onDelete }: FotoCellProps) {
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
