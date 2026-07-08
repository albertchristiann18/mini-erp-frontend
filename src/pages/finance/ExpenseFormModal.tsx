import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useExpenseCategories, useCreateExpense, useUpdateExpense } from '../../hooks/api/useFinance'
import { toast } from '../../lib/toast'
import type { Expense } from '../../types/finance'

const schema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(1, 'Amount must be > 0'),
  description: z.string().min(1, 'Description is required'),
  payment_method: z.enum(['CASH', 'TRANSFER', 'EWALLET', 'CREDIT']),
  expense_date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  expense?: Expense
}

export function ExpenseFormModal({ open, onClose, expense }: Props) {
  const { data: categoriesData } = useExpenseCategories()
  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: expense ? {
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      payment_method: expense.payment_method,
      expense_date: expense.expense_date,
      note: expense.note,
    } : {
      payment_method: 'TRANSFER',
      expense_date: new Date().toISOString().split('T')[0],
    },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      if (expense) {
        await updateMutation.mutateAsync({ id: expense.id, data: values })
        toast.success('Expense updated')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Expense created')
      }
      handleClose()
    } catch {
      toast.error('Failed to save expense')
    }
  }

  const categories = categoriesData?.results ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'New Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Category" error={errors.category?.message} required>
            <Select
              value={watch('category')}
              onValueChange={(v) => setValue('category', v, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Amount (IDR)" error={errors.amount?.message} required>
            <Input type="number" {...register('amount', { valueAsNumber: true })} placeholder="0" />
          </FormField>
          <FormField label="Description" error={errors.description?.message} required>
            <Textarea {...register('description')} placeholder="Expense description" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Method" error={errors.payment_method?.message} required>
              <Select
                value={watch('payment_method')}
                onValueChange={(v) => setValue('payment_method', v as FormValues['payment_method'], { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CASH', 'TRANSFER', 'EWALLET', 'CREDIT'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Date" error={errors.expense_date?.message} required>
              <Input type="date" {...register('expense_date')} />
            </FormField>
          </div>
          <FormField label="Note" error={errors.note?.message}>
            <Textarea {...register('note')} placeholder="Optional note" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : expense ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
