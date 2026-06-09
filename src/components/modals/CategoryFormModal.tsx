import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCategory, useUpdateCategory } from '../../hooks/useInventory'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { toast } from '../../lib/toast'
import type { Category } from '../../types/inventory'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category_code: z.string().min(1, 'Category code is required').max(10).toUpperCase(),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  category?: Category
  onCreated?: (category: Category) => void
}

export function CategoryFormModal({ open, onClose, category, onCreated }: Props) {
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category_code: '', description: '' },
  })

  useEffect(() => {
    if (open) {
      reset(category
        ? { name: category.name, category_code: category.category_code, description: category.description || '' }
        : { name: '', category_code: '', description: '' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id])

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      if (category) {
        await updateMutation.mutateAsync({ id: category.id, data: { name: values.name, category_code: values.category_code.toUpperCase(), description: values.description || '' } })
        toast.success('Category updated')
        handleClose()
      } else {
        const newCategory = await createMutation.mutateAsync({
          name: values.name,
          category_code: values.category_code.toUpperCase(),
          description: values.description || '',
        })
        toast.success('Category created')
        onCreated?.(newCategory)
        handleClose()
      }
    } catch {
      toast.error('Failed to save category')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Category Name" error={errors.name?.message} required>
            <Input {...register('name')} placeholder="e.g. Dress" />
          </FormField>
          <FormField label="Category Code" error={errors.category_code?.message} required>
            <Input {...register('category_code')} placeholder="e.g. DRS" />
            <p className="text-xs text-muted-foreground mt-1">
              Short code, e.g. DRS for Dress, JNG for Jeans — used in SKU generation
            </p>
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} placeholder="Optional description" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
