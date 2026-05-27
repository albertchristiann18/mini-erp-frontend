import { useState, useMemo } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { toast } from '../../lib/toast'
import {
  useCashTransactions, useCreateCashTransaction, useUpdateCashTransaction, useDeleteCashTransaction,
} from '../../hooks/useFinance'
import type { CashTransaction, CashTransactionCreate, TransactionCategory } from '../../types/finance'

const CATEGORY_LABELS: Record<string, string> = {
  SALES_SETTLEMENT: 'Sales Settlement',
  EQUITY_INJECTION: 'Equity Injection',
  FOUNDER_LOAN: 'Founder Loan',
  BANK_INTEREST: 'Bank Interest',
  SUPPLIER_REFUND: 'Supplier Refund',
  OTHER_INCOME: 'Other Income',
  OTHER_EXPENSE: 'Other Expense',
}

function fmtIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export default function CashTransactionsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CashTransaction | null>(null)

  const [form, setForm] = useState<CashTransactionCreate>({
    transaction_date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: 0,
    transaction_type: 'INFLOW',
    category: 'OTHER_INCOME',
    reference_number: '',
    note: '',
  })

  const openNewDialog = () => {
    setEditTarget(null)
    setForm({
      transaction_date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: 0,
      transaction_type: 'INFLOW',
      category: 'OTHER_INCOME',
      reference_number: '',
      note: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (tx: CashTransaction) => {
    setEditTarget(tx)
    setForm({
      transaction_date: tx.transaction_date,
      description: tx.description,
      amount: tx.amount,
      transaction_type: tx.transaction_type,
      category: tx.category,
      reference_number: tx.reference_number,
      note: tx.note,
    })
    setDialogOpen(true)
  }

  const params: Record<string, string | number> = {}
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  if (typeFilter !== 'ALL') params.transaction_type = typeFilter
  if (categoryFilter !== 'ALL') params.category = categoryFilter

  const { data, isLoading } = useCashTransactions(params)
  const createTx = useCreateCashTransaction()
  const updateTx = useUpdateCashTransaction()
  const deleteTx = useDeleteCashTransaction()

  const transactions = useMemo(() => data?.results ?? [], [data?.results])
  const totalInflow = useMemo(
    () => transactions.filter(t => t.transaction_type === 'INFLOW').reduce((s, t) => s + t.amount, 0),
    [transactions],
  )
  const totalOutflow = useMemo(
    () => transactions.filter(t => t.transaction_type === 'OUTFLOW').reduce((s, t) => s + t.amount, 0),
    [transactions],
  )
  const netFlow = totalInflow - totalOutflow

  async function handleSave() {
    if (!form.description || form.amount <= 0) {
      toast.error('Description and amount are required')
      return
    }
    try {
      if (editTarget) {
        await updateTx.mutateAsync({ id: editTarget.id, data: form })
        toast.success('Transaction updated')
      } else {
        await createTx.mutateAsync(form)
        toast.success('Transaction created')
      }
      setDialogOpen(false)
      setEditTarget(null)
    } catch {
      toast.error('Failed to save transaction')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    try {
      await deleteTx.mutateAsync(id)
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cash Transactions</h1>
        <Button size="sm" onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-1" /> New Transaction
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Inflow</div>
          <div className="text-xl font-semibold text-green-600">{fmtIDR(totalInflow)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Outflow</div>
          <div className="text-xl font-semibold text-red-600">{fmtIDR(totalOutflow)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Net Flow</div>
          <div className={`text-xl font-semibold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtIDR(Math.abs(netFlow))} {netFlow >= 0 ? '\u25B2' : '\u25BC'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="To" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INFLOW">Inflow</SelectItem>
            <SelectItem value="OUTFLOW">Outflow</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No transactions found</TableCell></TableRow>
            ) : transactions.map(tx => (
              <TableRow key={tx.id}>
                <TableCell className="tabular-nums">{tx.transaction_date}</TableCell>
                <TableCell>
                  <div>{tx.description}</div>
                  {tx.reference_number && <div className="text-xs text-muted-foreground">{tx.reference_number}</div>}
                </TableCell>
                <TableCell>{CATEGORY_LABELS[tx.category] ?? tx.category}</TableCell>
                <TableCell>
                  <Badge variant={tx.transaction_type === 'INFLOW' ? 'default' : 'destructive'}>
                    {tx.transaction_type === 'INFLOW' ? 'In' : 'Out'}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${tx.transaction_type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.transaction_type === 'INFLOW' ? '+' : '-'}{fmtIDR(tx.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openEditDialog(tx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(tx.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.transaction_date}
                  onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.transaction_type}
                  onValueChange={v => setForm(f => ({ ...f, transaction_type: v as 'INFLOW' | 'OUTFLOW' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFLOW">Inflow</SelectItem>
                    <SelectItem value="OUTFLOW">Outflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v as TransactionCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Shopee withdrawal April" />
            </div>
            <div className="space-y-1">
              <Label>Amount (IDR)</Label>
              <Input type="number" min={0} value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Reference Number (optional)</Label>
              <Input value={form.reference_number ?? ''}
                onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Input value={form.note ?? ''}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTx.isPending || updateTx.isPending}>
              {createTx.isPending || updateTx.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
