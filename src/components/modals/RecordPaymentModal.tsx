import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useRecordPayment } from '../../hooks/api/useFinance'
import { toast } from '../../lib/toast'
import { formatIDR } from '../../lib/utils'

const schema = z.object({
  amount: z.number().min(1, 'Amount must be > 0'),
  payment_method: z.enum(['CASH', 'TRANSFER', 'EWALLET', 'CREDIT']),
  payment_date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  apId: string
  remainingAmount: number
}

export function RecordPaymentModal({ open, onClose, apId, remainingAmount }: Props) {
  const mutation = useRecordPayment()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_method: 'TRANSFER',
      payment_date: new Date().toISOString().split('T')[0],
    },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    if (values.amount > remainingAmount) {
      toast.error(`Amount exceeds remaining balance of ${formatIDR(remainingAmount)}`)
      return
    }
    try {
      await mutation.mutateAsync({ id: apId, data: values })
      toast.success('Payment recorded')
      handleClose()
    } catch {
      toast.error('Failed to record payment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Remaining balance: <span className="font-medium text-foreground">{formatIDR(remainingAmount)}</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Amount (IDR)" error={errors.amount?.message} required>
            <Input type="number" {...register('amount', { valueAsNumber: true })} placeholder="0" max={remainingAmount} />
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
            <FormField label="Payment Date" error={errors.payment_date?.message} required>
              <Input type="date" {...register('payment_date')} />
            </FormField>
          </div>
          <FormField label="Note" error={errors.note?.message}>
            <Textarea {...register('note')} placeholder="Optional note" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
