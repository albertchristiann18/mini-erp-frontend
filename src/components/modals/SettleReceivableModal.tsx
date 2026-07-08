import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useSettleReceivable } from '../../hooks/api/useFinance'
import { toast } from '../../lib/toast'
import { formatIDR } from '../../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  arId: string
  expectedAmount: number
  settledAmount: number
}

export function SettleReceivableModal({ open, onClose, arId, expectedAmount, settledAmount }: Props) {
  const mutation = useSettleReceivable()
  const remaining = expectedAmount - settledAmount

  const schema = z.object({
    settled_amount: z.number()
      .min(1, 'Amount must be > 0')
      .max(remaining, `Cannot exceed remaining ${formatIDR(remaining)}`),
  })
  type FormValues = z.infer<typeof schema>

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { settled_amount: remaining },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync({ id: arId, data: values })
      toast.success('Receivable settled')
      handleClose()
    } catch {
      toast.error('Failed to settle receivable')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Receivable</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Remaining: <span className="font-medium text-foreground">{formatIDR(remaining)}</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Amount to Settle (IDR)" error={errors.settled_amount?.message} required>
            <Input type="number" {...register('settled_amount', { valueAsNumber: true })} max={remaining} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Settling...' : 'Settle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
