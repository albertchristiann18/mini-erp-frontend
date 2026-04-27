import { useProducts } from '../../hooks/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'

export default function ProductsPage() {
  const { data, isLoading } = useProducts()

  return (
    <div className="space-y-4">
      <span className="text-sm text-muted-foreground">{data?.count ?? 0} products</span>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>{p.category_name}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? 'success' : 'secondary'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
