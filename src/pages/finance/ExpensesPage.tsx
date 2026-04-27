import { useState } from 'react'
import { useExpenses } from '../../hooks/useFinance'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { ExpenseFormModal } from '../../components/modals/ExpenseFormModal'
import { formatIDR, formatDate } from '../../lib/utils'
import { Plus, Pencil } from 'lucide-react'
import type { Expense } from '../../types/finance'

export default function ExpensesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | undefined>()
  const { data, isLoading } = useExpenses({ page, page_size: 20 })
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} expenses</span>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Expense
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense #</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              {user?.is_staff && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(exp => (
              <TableRow key={exp.id}>
                <TableCell className="font-mono text-xs">{exp.expense_number}</TableCell>
                <TableCell>{exp.category_name}</TableCell>
                <TableCell className="max-w-xs truncate">{exp.description}</TableCell>
                <TableCell><Badge variant="secondary">{exp.payment_method}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatIDR(exp.amount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(exp.expense_date)}</TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(exp); setShowModal(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <ExpenseFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(undefined) }}
        expense={editing}
      />
    </div>
  )
}
