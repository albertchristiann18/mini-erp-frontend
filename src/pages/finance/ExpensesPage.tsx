import { useExpenses } from '../../hooks/useFinance'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { formatIDR, formatDate } from '../../lib/utils'

export default function ExpensesPage() {
  const { data, isLoading } = useExpenses()

  return (
    <div className="space-y-4">
      <span className="text-sm text-muted-foreground">{data?.count ?? 0} expenses</span>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(exp => (
              <TableRow key={exp.id}>
                <TableCell className="font-mono text-xs">{exp.expense_number}</TableCell>
                <TableCell>{exp.category_name}</TableCell>
                <TableCell className="max-w-xs truncate">{exp.description}</TableCell>
                <TableCell><Badge variant="secondary">{exp.payment_method}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatIDR(exp.amount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(exp.expense_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
