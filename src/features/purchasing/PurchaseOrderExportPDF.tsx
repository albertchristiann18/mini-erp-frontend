import { Document, Page, View, Text, Image, Link, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer'
import type { PurchaseOrder, PurchaseOrderDetail } from '../../types/purchasing'

interface ProductGroup {
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  items: PurchaseOrderDetail[]
}

function groupByProduct(details: PurchaseOrderDetail[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()
  for (const item of details) {
    if (!map.has(item.product_id)) {
      map.set(item.product_id, {
        product_id: item.product_id,
        product_name: item.product_name,
        product_supplier_link: item.product_supplier_link,
        product_photo_url: item.product_photo_url,
        items: [],
      })
    }
    map.get(item.product_id)!.items.push(item)
  }
  return Array.from(map.values())
}

function fmtNum(val: string | number | null | undefined, decimals = 2): string {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(decimals)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  headerRow: { flexDirection: 'row', gap: 20, marginBottom: 2 },
  headerLabel: { color: '#6b7280' },
  headerValue: { fontWeight: 'bold' },
  productBlock: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
    paddingTop: 10,
    gap: 10,
  },
  imageBox: { width: 64, height: 64, flexShrink: 0 },
  productImage: { width: 64, height: 64, objectFit: 'cover', borderRadius: 2 },
  imagePlaceholder: { width: 64, height: 64, backgroundColor: '#f3f4f6', borderRadius: 2 },
  productContent: { flex: 1 },
  productName: { fontSize: 9, fontWeight: 'bold', marginBottom: 2 },
  productLink: { fontSize: 7, color: '#2563eb', marginBottom: 6, textDecoration: 'none' },
  table: { marginTop: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 2 },
  tableHeaderRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#d1d5db', backgroundColor: '#f9fafb' },
  subtotalRow: { borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 4, marginTop: 2 },
  colVariant: { flex: 3, paddingHorizontal: 2 },
  colQty: { width: 32, textAlign: 'right', paddingHorizontal: 2 },
  colPrice: { width: 48, textAlign: 'right', paddingHorizontal: 2 },
  colTotal: { width: 56, textAlign: 'right', paddingHorizontal: 2, fontWeight: 'bold' },
  headerText: { color: '#6b7280', fontSize: 7 },
  subtotalText: { fontWeight: 'bold', fontSize: 8 },
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  footerLabel: { color: '#6b7280' },
  footerValue: { fontWeight: 'bold', fontSize: 9 },
})

interface DocProps {
  po: PurchaseOrder
  groups: ProductGroup[]
  grandTotalForeign: number
  currencySymbol: string
}

function PODocument({ po, groups, grandTotalForeign, currencySymbol }: DocProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Purchase Order</Text>
          <View style={styles.headerRow}>
            <Text><Text style={styles.headerLabel}>PO: </Text><Text style={styles.headerValue}>{po.purchase_order_number}</Text></Text>
            <Text><Text style={styles.headerLabel}>Supplier: </Text><Text style={styles.headerValue}>{po.supplier_name ?? '—'}</Text></Text>
            <Text><Text style={styles.headerLabel}>Date: </Text><Text style={styles.headerValue}>{fmtDate(po.cdate)}</Text></Text>
          </View>
          <View style={styles.headerRow}>
            <Text><Text style={styles.headerLabel}>Total Qty: </Text><Text style={styles.headerValue}>{po.total_ordered_qty} units</Text></Text>
            <Text><Text style={styles.headerLabel}>Total: </Text><Text style={styles.headerValue}>{currencySymbol} {grandTotalForeign.toFixed(2)}</Text></Text>
          </View>
        </View>

        {groups.map((group, gi) => {
          const subtotalQty = group.items.reduce((s, i) => s + i.ordered_qty, 0)
          const subtotalAmt = group.items.reduce((s, i) =>
            s + Number(i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0), 0)
          return (
            <View key={gi} style={styles.productBlock} wrap={false}>
              <View style={styles.imageBox}>
                {group.product_photo_url
                  ? <Image src={group.product_photo_url} style={styles.productImage} />
                  : <View style={styles.imagePlaceholder} />
                }
              </View>

              <View style={styles.productContent}>
                <Text style={styles.productName}>{group.product_name}</Text>
                {group.product_supplier_link && (
                  <Link src={group.product_supplier_link} style={styles.productLink}>
                    {group.product_supplier_link}
                  </Link>
                )}

                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.colVariant, styles.headerText]}>Variant</Text>
                    <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
                    <Text style={[styles.colPrice, styles.headerText]}>Unit {currencySymbol}</Text>
                    <Text style={[styles.colPrice, styles.headerText]}>Disc {currencySymbol}</Text>
                    <Text style={[styles.colTotal, styles.headerText]}>Total {currencySymbol}</Text>
                  </View>

                  {group.items.map((item, ii) => {
                    const unitP = Number(item.unit_price_foreign ?? 0)
                    const discP = Number(item.discounted_unit_price_foreign ?? item.unit_price_foreign ?? 0)
                    const total = Number(item.discounted_total_price_foreign ?? item.total_price_foreign ?? 0)
                    return (
                      <View key={ii} style={styles.tableRow}>
                        <Text style={styles.colVariant}>{item.product_variant_name}</Text>
                        <Text style={styles.colQty}>{item.ordered_qty}</Text>
                        <Text style={styles.colPrice}>{fmtNum(unitP)}</Text>
                        <Text style={styles.colPrice}>{fmtNum(discP)}</Text>
                        <Text style={styles.colTotal}>{fmtNum(total)}</Text>
                      </View>
                    )
                  })}

                  <View style={[styles.tableRow, styles.subtotalRow]}>
                    <Text style={[styles.colVariant, styles.subtotalText]}>Subtotal</Text>
                    <Text style={[styles.colQty, styles.subtotalText]}>{subtotalQty}</Text>
                    <Text style={styles.colPrice} />
                    <Text style={styles.colPrice} />
                    <Text style={[styles.colTotal, styles.subtotalText]}>{subtotalAmt.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )
        })}

        <View style={styles.footer}>
          <Text><Text style={styles.footerLabel}>Grand Total Qty: </Text><Text style={styles.footerValue}>{po.total_ordered_qty} units</Text></Text>
          <Text><Text style={styles.footerLabel}>Grand Total: </Text><Text style={styles.footerValue}>{currencySymbol} {grandTotalForeign.toFixed(2)}</Text></Text>
        </View>
      </Page>
    </Document>
  )
}

function getCurrencySymbol(currency: string | null | undefined): string {
  const map: Record<string, string> = {
    CNY: '¥', RMB: '¥', USD: '$', EUR: '€', SGD: 'S$', IDR: 'Rp',
  }
  return map[(currency ?? '').toUpperCase()] ?? (currency ?? '¥')
}

interface Props {
  po: PurchaseOrder
  onDownload?: () => void
}

export default function PurchaseOrderExportPDF({ po }: Props) {
  const groups = groupByProduct(po.order_details ?? [])
  const currencySymbol = getCurrencySymbol(po.currency)
  const grandTotalForeign = (po.order_details ?? []).reduce((s, i) =>
    s + Number(i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0), 0)

  const handleDownload = async () => {
    const blob = await pdf(
      <PODocument po={po} groups={groups} grandTotalForeign={grandTotalForeign} currencySymbol={currencySymbol} />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PO-${po.purchase_order_number}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <PDFViewer width="100%" height="100%" showToolbar>
        <PODocument po={po} groups={groups} grandTotalForeign={grandTotalForeign} currencySymbol={currencySymbol} />
      </PDFViewer>
      <div className="flex justify-end px-6 py-3 border-t bg-background">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={handleDownload}
        >
          Download PDF
        </button>
      </div>
    </div>
  )
}
