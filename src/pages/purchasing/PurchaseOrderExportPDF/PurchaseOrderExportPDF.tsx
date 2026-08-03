import { PDFViewer, pdf } from '@react-pdf/renderer'
import type { PurchaseOrder } from '../../../types/purchasing'
import type { SubGroup } from '../purchaseOrderPDFUtils'
import { groupBySubGroup } from '../purchaseOrderPDFUtils'
import { getCurrencySymbol } from './pdfFormat'
import { PODocument } from './PODocument'
import { usePdfDownload } from './usePdfDownload'

interface Props {
  po: PurchaseOrder
  subGroups?: SubGroup[]
  imageMap?: Record<string, string>
  onDownload?: () => void
}

export default function PurchaseOrderExportPDF({
  po,
  subGroups: subGroupsProp,
  imageMap: imageMapProp,
  onDownload,
}: Props) {
  const subGroups = subGroupsProp ?? groupBySubGroup(po.order_details ?? [])
  const imageMap = imageMapProp ?? {}
  const currencySymbol = getCurrencySymbol(po.currency)
  const grandTotalQty = subGroups.reduce(
    (s, sg) => s + sg.items.reduce((si, i) => si + i.ordered_qty, 0),
    0,
  )
  const grandTotalForeign = subGroups.reduce(
    (s, sg) =>
      s + sg.items.reduce(
        (si, i) => si + Number(i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0),
        0,
      ),
    0,
  )

  const { isDownloading, handleDownload } = usePdfDownload({
    filename: `PO-${po.purchase_order_number}.pdf`,
    onDownload,
  })

  const downloadDisabled = isDownloading || subGroups.length === 0

  return (
    <div className="flex flex-col h-full">
      <PDFViewer width="100%" height="100%" showToolbar>
        <PODocument
          po={po}
          subGroups={subGroups}
          grandTotalQty={grandTotalQty}
          grandTotalForeign={grandTotalForeign}
          currencySymbol={currencySymbol}
          imageMap={imageMap}
        />
      </PDFViewer>
      <div className="flex justify-end px-6 py-3 border-t bg-background">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() =>
            handleDownload(() =>
              pdf(
                <PODocument
                  po={po}
                  subGroups={subGroups}
                  grandTotalQty={grandTotalQty}
                  grandTotalForeign={grandTotalForeign}
                  currencySymbol={currencySymbol}
                  imageMap={imageMapProp ?? {}}
                />,
              ).toBlob()
            )
          }
          disabled={downloadDisabled}
          aria-disabled={downloadDisabled}
        >
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>
    </div>
  )
}
