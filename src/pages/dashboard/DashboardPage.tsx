import { useDashboardKPIs } from '../../hooks/api/useFinance'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { formatIDR } from '../../lib/utils'
import { QueryState } from '../../components/ui/queryPrimitives'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'

const today = new Date()
const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const endDate = today.toISOString().split('T')[0]

export default function DashboardPage() {
  const kpisQuery = useDashboardKPIs(startDate, endDate)

  return (
    <QueryState query={kpisQuery} emptyMessage="No data available.">
      {(kpis) => {
        const kpiCards = [
          { label: 'Total Revenue', value: formatIDR(kpis.total_revenue), icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
          { label: 'Total Expenses', value: formatIDR(kpis.total_expenses), icon: <TrendingDown className="h-4 w-4 text-red-500" /> },
          { label: 'Gross Profit', value: formatIDR(kpis.gross_profit), icon: <DollarSign className="h-4 w-4 text-blue-500" /> },
          { label: 'Outstanding Payables', value: formatIDR(kpis.outstanding_payables), icon: <AlertCircle className="h-4 w-4 text-yellow-500" /> },
          { label: 'Outstanding Receivables', value: formatIDR(kpis.outstanding_receivables), icon: <AlertCircle className="h-4 w-4 text-orange-500" /> },
          { label: 'Total Orders', value: String(kpis.total_orders), icon: <TrendingUp className="h-4 w-4 text-purple-500" /> },
        ]

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {kpiCards.map(card => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>{card.label}</CardTitle>
                      {card.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {kpis.monthly_revenue?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kpis.monthly_revenue}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatIDR(Number(v))} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )
      }}
    </QueryState>
  )
}
