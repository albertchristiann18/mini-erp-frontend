import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { useIncomeStatement, useBalanceSheet, useCashFlow } from '../../hooks/api/useFinance'
import { Loading, ErrorState } from '../../components/ui/queryPrimitives'
import { formatIDR } from '../../lib/utils'
import type { ApiError } from '../../lib/errors'

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [asOfDate, setAsOfDate] = useState(today)

  const incomeQ = useIncomeStatement(startDate, endDate)
  const balanceQ = useBalanceSheet(asOfDate)
  const cashflowQ = useCashFlow(startDate, endDate)

  return (
    <Tabs defaultValue="income">
      <TabsList>
        <TabsTrigger value="income">Income Statement</TabsTrigger>
        <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
        <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
      </TabsList>

      <TabsContent value="income">
        <div className="mb-4 flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
        {incomeQ.isLoading && <Loading />}
        {incomeQ.isError && <ErrorState error={incomeQ.error as unknown as ApiError} onRetry={incomeQ.refetch} />}
        {incomeQ.data && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatIDR(incomeQ.data.revenue)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>COGS</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatIDR(incomeQ.data.cogs)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Gross Profit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{formatIDR(incomeQ.data.gross_profit)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{formatIDR(incomeQ.data.total_expenses)}</p></CardContent></Card>
            <Card className="md:col-span-2"><CardHeader><CardTitle>Net Profit</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{formatIDR(incomeQ.data.net_profit)}</p></CardContent></Card>
          </div>
        )}
      </TabsContent>

      <TabsContent value="balance">
        <div className="mb-4 flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">As of Date</label>
            <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-40" />
          </div>
        </div>
        {balanceQ.isLoading && <Loading />}
        {balanceQ.isError && <ErrorState error={balanceQ.error as unknown as ApiError} onRetry={balanceQ.refetch} />}
        {balanceQ.data && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Total Assets</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatIDR(balanceQ.data.assets.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">Cash: {formatIDR(balanceQ.data.assets.cash)} · AR: {formatIDR(balanceQ.data.assets.receivables)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Total Liabilities</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{formatIDR(balanceQ.data.liabilities.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">AP: {formatIDR(balanceQ.data.liabilities.payables)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Equity</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-emerald-600">{formatIDR(balanceQ.data.equity)}</p></CardContent>
            </Card>
          </div>
        )}
      </TabsContent>

      <TabsContent value="cashflow">
        <div className="mb-4 flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
        {cashflowQ.isLoading && <Loading />}
        {cashflowQ.isError && <ErrorState error={cashflowQ.error as unknown as ApiError} onRetry={cashflowQ.refetch} />}
        {cashflowQ.data && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Collections</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{formatIDR(cashflowQ.data.operating.collections)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{formatIDR(cashflowQ.data.operating.payments)}</p></CardContent></Card>
            <Card className="md:col-span-2"><CardHeader><CardTitle>Net Cash Flow</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{formatIDR(cashflowQ.data.net_cash_flow)}</p></CardContent></Card>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
