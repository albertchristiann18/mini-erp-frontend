import { useState, useRef } from 'react'
import { X, ImagePlus } from 'lucide-react'
import type { ProductPhoto } from '../../types/inventory'
import { uploadProductPhoto, deleteProductPhoto, reorderProductPhotos } from '../../api/inventory'
import { toast } from '../../lib/toast'

interface Props {
  productId: string | null
  photos: ProductPhoto[]
  pendingFiles: File[]
  onPhotosChange: (photos: ProductPhoto[]) => void
  onPendingFilesChange: (files: File[]) => void
}

export function PhotoUploadGrid({ productId, photos, pendingFiles, onPhotosChange, onPendingFilesChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const allItems = productId ? photos : pendingFiles.map((f, i) => ({
    id: `pending-${i}`,
    image_url: URL.createObjectURL(f),
    order: i,
    is_primary: i === 0,
  }))

  const totalCount = allItems.length
  const canAdd = totalCount < 9

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 9 - totalCount
    const toAdd = files.slice(0, remaining)
    if (!productId) {
      onPendingFilesChange([...pendingFiles, ...toAdd])
      return
    }
    setUploading(true)
    try {
      const uploaded: ProductPhoto[] = []
      for (const file of toAdd) {
        const r = await uploadProductPhoto(productId, file)
        uploaded.push(r.data)
      }
      onPhotosChange([...photos, ...uploaded])
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (index: number) => {
    if (!productId) {
      const newFiles = pendingFiles.filter((_, i) => i !== index)
      onPendingFilesChange(newFiles)
      return
    }
    const photo = photos[index]
    try {
      await deleteProductPhoto(productId, photo.id)
      onPhotosChange(photos.filter((_, i) => i !== index))
    } catch {
      toast.error('Failed to delete photo')
    }
  }

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return
    const reordered = [...allItems]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setDragIndex(null)

    if (!productId) {
      const newFiles = reordered.map(item => {
        const idx = parseInt(item.id.replace('pending-', ''))
        return pendingFiles[idx]
      })
      onPendingFilesChange(newFiles)
      return
    }
    const newOrder = reordered.map(item => item.id)
    try {
      await reorderProductPhotos(productId, newOrder)
      onPhotosChange(reordered.map((item, i) => ({ ...item, order: i, is_primary: i === 0 })))
    } catch {
      toast.error('Failed to reorder photos')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Photos</span>
        <span className="text-xs text-muted-foreground">{totalCount}/9</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {allItems.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-grab ${
              item.is_primary ? 'border-primary' : 'border-border'
            } ${dragIndex === index ? 'opacity-50' : ''}`}
          >
            <img src={item.image_url || ''} alt="" className="w-full h-full object-cover" />
            {item.is_primary && (
              <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                Main
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDelete(index)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {canAdd && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <ImagePlus className="w-6 h-6 mb-1" />
            <span className="text-xs">{uploading ? 'Uploading...' : 'Add Photo'}</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Drag to reorder. First photo is the main photo.</p>
    </div>
  )
}