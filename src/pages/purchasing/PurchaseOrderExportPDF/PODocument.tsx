import { Document, Page, View, Text, Image, Link } from '@react-pdf/renderer'
import type { PurchaseOrder } from '../../../types/purchasing'
import type { SubGroup } from '../purchaseOrderPDFUtils'
import styles from './pdfStyles'
import { fmtNum, fmtDate } from './pdfFormat'

interface PODocumentProps {
  po: PurchaseOrder
  subGroups: SubGroup[]
  grandTotalQty: number
  grandTotalForeign: number
  currencySymbol: string
  imageMap: Record<string, string>
}

export function PODocument({ po, subGroups, grandTotalQty, grandTotalForeign, currencySymbol, imageMap }: PODocumentProps) {
  const productOrder: string[] = []
  const productMeta: Record<string, { product_name: string; product_supplier_link: string | null }> = {}
  const subGroupsByProduct: Record<string, SubGroup[]> = {}
  for (const sg of subGroups) {
    if (!productOrder.includes(sg.product_id)) {
      productOrder.push(sg.product_id)
      productMeta[sg.product_id] = {
        product_name: sg.product_name,
        product_supplier_link: sg.product_supplier_link,
      }
      subGroupsByProduct[sg.product_id] = []
    }
    subGroupsByProduct[sg.product_id].push(sg)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Purchase Order</Text>
          <View style={styles.headerRow}>
            <Text style={{ flexShrink: 0 }}>
              <Text style={styles.headerLabel}>PO: </Text>
              <Text style={styles.headerValue}>{po.purchase_order_number}</Text>
            </Text>
            <View style={{ flex: 1 }}>
              <Text>
                <Text style={styles.headerLabel}>Supplier: </Text>
                <Text style={styles.headerValue}>{po.supplier_name ?? '—'}</Text>
              </Text>
            </View>
            <Text style={{ flexShrink: 0 }}>
              <Text style={styles.headerLabel}>Date: </Text>
              <Text style={styles.headerValue}>{fmtDate(po.cdate)}</Text>
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text>
              <Text style={styles.headerLabel}>Total Qty: </Text>
              <Text style={styles.headerValue}>{grandTotalQty} units</Text>
            </Text>
            <Text>
              <Text style={styles.headerLabel}>Total: </Text>
              <Text style={styles.headerValue}>{currencySymbol} {grandTotalForeign.toFixed(2)}</Text>
            </Text>
          </View>
        </View>

        {productOrder.map((productId) => {
          const meta = productMeta[productId]
          const sgs = subGroupsByProduct[productId]

          return (
            <View key={productId}>
              <View style={styles.productSectionHeader}>
                <Text style={styles.productName}>{meta.product_name}</Text>
                {meta.product_supplier_link && (
                  <Link src={meta.product_supplier_link} style={styles.productLink}>
                    {meta.product_supplier_link}
                  </Link>
                )}
              </View>

              {sgs.map((sg) => {
                const photoSrc = imageMap[sg.key] ?? null
                const subtotalQty = sg.items.reduce((s, i) => s + i.ordered_qty, 0)
                const subtotalAmt = sg.items.reduce(
                  (s, i) => s + Number(i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0),
                  0,
                )
                return (
                  <View key={sg.key} style={styles.subGroupBlock} wrap={false}>
                    <View style={styles.imageBox}>
                      {photoSrc
                        ? <Image src={photoSrc} style={styles.productImage} />
                        : <View style={styles.imagePlaceholder} />
                      }
                    </View>
                    <View style={styles.productContent}>
                      {sg.first_dim_value !== '' && (
                        <Text style={styles.subGroupLabel}>{sg.first_dim_value}</Text>
                      )}
                      <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.colVariant, styles.headerText]}>Variant</Text>
                          <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
                          <Text style={[styles.colPrice, styles.headerText]}>Unit {currencySymbol}</Text>
                          <Text style={[styles.colPrice, styles.headerText]}>Disc {currencySymbol}</Text>
                          <Text style={[styles.colTotal, styles.headerText]}>Total {currencySymbol}</Text>
                        </View>
                        {sg.items.map((item) => {
                          const unitP = Number(item.unit_price_foreign ?? 0)
                          const discP = Number(item.discounted_unit_price_foreign ?? item.unit_price_foreign ?? 0)
                          const total = Number(item.discounted_total_price_foreign ?? item.total_price_foreign ?? 0)
                          return (
                            <View key={item.id} style={styles.tableRow}>
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
            </View>
          )
        })}

        <View style={styles.footer}>
          <Text>
            <Text style={styles.footerLabel}>Grand Total Qty: </Text>
            <Text style={styles.footerValue}>{grandTotalQty} units</Text>
          </Text>
          <Text>
            <Text style={styles.footerLabel}>Grand Total: </Text>
            <Text style={styles.footerValue}>{currencySymbol} {grandTotalForeign.toFixed(2)}</Text>
          </Text>
        </View>
      </Page>
    </Document>
  )
}
