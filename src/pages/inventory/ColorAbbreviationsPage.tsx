import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useColorAbbreviations, useUpsertColorAbbreviation, useDeleteColorAbbreviation } from '../../hooks/purchasing/useSourcingPool'
import { toast } from '../../lib/toast'
import type { ColorAbbreviation } from '../../types/purchasing'

const schema = z.object({
  color_name: z.string().min(1, 'Color name is required'),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(20, 'Max 20 characters'),
})

type FormValues = z.infer<typeof schema>

export default function ColorAbbreviationsPage() {
  const { data: abbreviations, isLoading } = useColorAbbreviations()
  const upsertMutation = useUpsertColorAbbreviation()
  const deleteMutation = useDeleteColorAbbreviation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ColorAbbreviation | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (dialogOpen) {
      reset(editingItem
        ? { color_name: editingItem.color_name, abbreviation: editingItem.abbreviation }
        : { color_name: '', abbreviation: '' })
    }
  }, [dialogOpen, editingItem, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await upsertMutation.mutateAsync({ color_name: values.color_name, abbreviation: values.abbreviation })
      toast.success(editingItem ? 'Color updated' : 'Color added')
      setDialogOpen(false)
      reset()
    } catch {
      toast.error('Failed to save color')
    }
  }

  const handleDelete = (item: ColorAbbreviation) => {
    if (!window.confirm(`Delete color "${item.color_name}"?`)) return
    deleteMutation.mutateAsync(item.color_name)
      .then(() => toast.success('Color deleted'))
      .catch(() => toast.error('Failed to delete color'))
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Color Abbreviations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage color abbreviations used in auto-generated SKU codes.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null)
            setDialogOpen(true)
          }}
        >
          Add Color
        </Button>
      </div>

      {!abbreviations || abbreviations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No color abbreviations defined yet.</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium">Color Name</th>
                <th className="px-4 py-2 text-left font-medium">Abbreviation</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {abbreviations.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{item.color_name}</td>
                  <td className="px-4 py-2 font-mono">{item.abbreviation}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingItem(item)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditingItem(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Color' : 'Add Color'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="color_name" className="text-xs text-muted-foreground mb-1 block">Color Name</label>
              <Input
                id="color_name"
                {...register('color_name')}
                disabled={!!editingItem}
                placeholder="e.g. Desert Sunrise"
              />
              {errors.color_name && (
                <p className="text-xs text-destructive mt-0.5">{errors.color_name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="abbreviation" className="text-xs text-muted-foreground mb-1 block">Abbreviation</label>
              <Input
                id="abbreviation"
                {...register('abbreviation')}
                placeholder="e.g. DSR"
                onChange={(e) => {
                  const synthetic = { target: { value: e.target.value.toUpperCase(), name: 'abbreviation' } }
                  register('abbreviation').onChange(synthetic)
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Keep it short (2–4 uppercase letters). It appears in auto-generated SKU codes.
              </p>
              {errors.abbreviation && (
                <p className="text-xs text-destructive mt-0.5">{errors.abbreviation.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingItem(null) }}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving...' : editingItem ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
