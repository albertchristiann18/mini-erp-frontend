import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect } from 'vitest'

vi.mock('../../../api/client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: new Blob() }) },
}))

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span data-testid="pdf-text">{children}</span>,
  Image: ({ src }: { src: string }) => (
    <img src={src} alt="" data-testid="pdf-image" />
  ),
  Link: ({ children, src }: { children: React.ReactNode; src?: string }) => (
    <a href={src} data-testid="pdf-link">{children}</a>
  ),
  StyleSheet: { create: () => ({}) },
  PDFViewer: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-viewer">{children}</div>,
  pdf: vi.fn(() => ({ toBlob: () => new Blob() })),
}))

import { pdf } from '@react-pdf/renderer'
import PurchaseOrderExportPDF from '../PurchaseOrderExportPDF'
import { groupBySubGroup } from '../purchaseOrderPDFUtils'
import type { SubGroup } from '../purchaseOrderPDFUtils'
import type { PurchaseOrder } from '../../../types/purchasing'

const mockPo = {
  id: 'po-1',
  company: 'c1',
  warehouse: 'w1',
  warehouse_name: 'Warehouse 1',
  company_name: 'Company 1',
  purchase_order_number: 'PO-001',
  status: 'ORDERED',
  supplier_name: 'Supplier A',
  supplier_id: null,
  forwarder_name: null,
  shop_services: null,
  commission_fee_pct: null,
  commission_fee: null,
  commission_fee_rmb: null,
  delivery_fee: null,
  delivery_fee_idr: null,
  currency: 'CNY',
  exchange_rate: '1500',
  cbm: null,
  weight: null,
  shipping_fee_per_cbm: null,
  shipping_fee: null,
  total_ordered_qty: 10,
  total_received_qty: 0,
  total_item_amount: null,
  total_order_amount: null,
  total_amount: 0,
  procure_amount: null,
  refund_amount: null,
  cost_ratio_cogs: 0,
  shipping_per_qty: 0,
  invoice_number: null,
  invoice_date: null,
  delivery_order_number: null,
  delivery_date: null,
  forecast_delivery_date: null,
  forecast_cbm: null,
  forecast_shipping_fee: null,
  forecast_shipping_fee_per_cbm: null,
  purchase_order_invoice_file: null,
  delivery_order_file: null,
  delivery_order_invoice_file: null,
  packing_list_file: null,
  note: null,
  has_discount: false,
  editable_fields: { header: [], order_detail: [] },
  next_status: null,
  status_history: [],
  cdate: '2024-01-01',
  udate: '2024-01-01',
  order_details: [],
}

function makeDetail(
  id: string,
  productId: string,
  productName: string,
  variantName: string,
  variantValues: Record<string, string>,
) {
  return {
    id,
    variant_id: id,
    product_variant_name: variantName,
    product_id: productId,
    product_name: productName,
    product_supplier_link: null,
    product_photo_url: null,
    ordered_qty: 5,
    received_qty: null,
    unit_price_foreign: '10.00',
    unit_price_base: 15000,
    discounted_unit_price_foreign: null,
    discounted_unit_price_base: null,
    total_price_foreign: '50.00',
    total_price_base: 75000,
    discounted_total_price_foreign: null,
    discounted_total_price_base: null,
    remarks: '',
    avg_sales: null,
    avg_sales_7d: null,
    stock_on_hand: 20,
    incoming_qty: 0,
    variant_values: variantValues,
    last_unit_price_foreign: null,
    last_currency: null,
    last_discounted_unit_price_foreign: null,
    shipping_per_unit_idr: null,
    delivery_per_unit_idr: null,
    commission_per_unit_idr: null,
    cogs_per_unit_idr: null,
    product_has_dimensions: null,
    product_dim1_key: null,
  }
}

it('PO export shows supplier link when available', () => {
  const poWithSupplierLink = {
    ...mockPo,
    status: 'ORDERED' as const,
    order_details: [
      {
        id: 'd1',
        variant_id: 'v1',
        product_variant_name: 'Red Variant',
        product_id: 'p1',
        product_name: 'Product A',
        product_supplier_link: 'https://supplier.example.com/product-a',
        product_photo_url: null,
        ordered_qty: 5,
        received_qty: null,
        unit_price_foreign: '10.00',
        unit_price_base: 15000,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: '50.00',
        total_price_base: 75000,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_unit_price_foreign: null,
        last_currency: null,
        last_discounted_unit_price_foreign: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
        product_dim1_key: null,
      },
    ],
  } satisfies PurchaseOrder

  render(<PurchaseOrderExportPDF po={poWithSupplierLink} />)

  const links = screen.getAllByTestId('pdf-link')
  expect(links.length).toBeGreaterThan(0)
  const supplierLink = links.find(l => l.getAttribute('href') === 'https://supplier.example.com/product-a')
  expect(supplierLink).toBeInTheDocument()
})

it('PO export shows image placeholder when no photo', () => {
  const poWithoutPhoto = {
    ...mockPo,
    status: 'ORDERED' as const,
    order_details: [
      {
        id: 'd1',
        variant_id: 'v1',
        product_variant_name: 'Red Variant',
        product_id: 'p1',
        product_name: 'Product A',
        product_supplier_link: null,
        product_photo_url: null,
        ordered_qty: 5,
        received_qty: null,
        unit_price_foreign: '10.00',
        unit_price_base: 15000,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: '50.00',
        total_price_base: 75000,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_unit_price_foreign: null,
        last_currency: null,
        last_discounted_unit_price_foreign: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
        product_dim1_key: null,
      },
    ],
  } satisfies PurchaseOrder

  render(<PurchaseOrderExportPDF po={poWithoutPhoto} />)

  const images = screen.queryAllByTestId('pdf-image')
  expect(images.length).toBe(0)
})

it('groupBySubGroup groups same-product variants into sub-groups by first dimension value', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'L / Orange Clam', { Color: 'Orange Clam', Size: 'L' }),
    makeDetail('d2', 'p1', 'Product A', 'M / Orange Clam', { Color: 'Orange Clam', Size: 'M' }),
    makeDetail('d3', 'p1', 'Product A', 'L / White Cherry', { Color: 'White Cherry', Size: 'L' }),
  ]
  const sgs = groupBySubGroup(details)
  expect(sgs).toHaveLength(2)
  const orange = sgs.find(sg => sg.first_dim_value === 'Orange Clam')!
  expect(orange.items).toHaveLength(2)
  expect(orange.key).toBe('p1::Orange Clam')
  const white = sgs.find(sg => sg.first_dim_value === 'White Cherry')!
  expect(white.items).toHaveLength(1)
})

it('groupBySubGroup assigns empty first_dim_value for items with no variant_values', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'One Size', {}),
    makeDetail('d2', 'p1', 'Product A', 'One Size Alt', {}),
  ]
  const sgs = groupBySubGroup(details)
  expect(sgs).toHaveLength(1)
  expect(sgs[0].first_dim_value).toBe('')
  expect(sgs[0].key).toBe('p1::')
  expect(sgs[0].items).toHaveLength(2)
})

it('groupBySubGroup sorts items within a sub-group by second dimension value', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'XL / Orange Clam', { Color: 'Orange Clam', Size: 'XL' }),
    makeDetail('d2', 'p1', 'Product A', 'S / Orange Clam', { Color: 'Orange Clam', Size: 'S' }),
    makeDetail('d3', 'p1', 'Product A', 'M / Orange Clam', { Color: 'Orange Clam', Size: 'M' }),
  ]
  const sgs = groupBySubGroup(details)
  expect(sgs).toHaveLength(1)
  const sizes = sgs[0].items.map(i => i.variant_values['Size'])
  expect(sizes).toEqual(['M', 'S', 'XL'])
})

it('groupBySubGroup maintains separate sub-groups for same color name across different products', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'L / Red', { Color: 'Red', Size: 'L' }),
    makeDetail('d2', 'p2', 'Product B', 'L / Red', { Color: 'Red', Size: 'L' }),
  ]
  const sgs = groupBySubGroup(details)
  expect(sgs).toHaveLength(2)
  expect(sgs[0].key).toBe('p1::Red')
  expect(sgs[1].key).toBe('p2::Red')
})

it('PDF sub-group block omits the color label when first_dim_value is empty', () => {
  const poNoVariantValues = {
    ...mockPo,
    status: 'ORDERED' as const,
    order_details: [
      {
        id: 'd1',
        variant_id: 'v1',
        product_variant_name: 'One Size',
        product_id: 'p1',
        product_name: 'Product A',
        product_supplier_link: null,
        product_photo_url: null,
        ordered_qty: 5,
        received_qty: null,
        unit_price_foreign: '10.00',
        unit_price_base: 15000,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: '50.00',
        total_price_base: 75000,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_unit_price_foreign: null,
        last_currency: null,
        last_discounted_unit_price_foreign: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
        product_dim1_key: null,
      },
    ],
  } satisfies PurchaseOrder

  const { container } = render(<PurchaseOrderExportPDF po={poNoVariantValues} />)
  const allTexts = Array.from(container.querySelectorAll('[data-testid="pdf-text"]')).map(
    el => el.textContent,
  )
  expect(allTexts.some(t => t?.includes('One Size'))).toBe(true)
  const occurrences = allTexts.filter(t => t === 'One Size').length
  expect(occurrences).toBe(1)
})

it('download button shows downloading state while in progress', async () => {
  vi.mocked(pdf).mockReturnValueOnce({
    container: document.createElement('div'),
    isDirty: () => false,
    toString: () => '',
    toBlob: () => new Promise(() => {}),
    toBuffer: () => new Promise(() => {}),
    on: () => {},
    removeListener: () => {},
    updateContainer: () => {},
  } as never)

  const oneSubGroup: SubGroup[] = [{
    key: 'p1::',
    product_id: 'p1',
    product_name: 'Product A',
    product_supplier_link: null,
    product_photo_url: null,
    first_dim_value: '',
    items: [],
  }]

  const user = userEvent.setup()
  render(<PurchaseOrderExportPDF po={{ ...mockPo, status: 'ORDERED' as const }} subGroups={oneSubGroup} />)

  const button = screen.getByRole('button', { name: /download pdf/i })
  await user.click(button)

  expect(screen.getByRole('button', { name: /downloading\.\.\./i })).toBeInTheDocument()
  expect(button).toBeDisabled()
})

it('PDF sub-group uses discounted_total_price_foreign for total when available', () => {
  const poWithDiscount = {
    ...mockPo,
    status: 'ORDERED' as const,
    order_details: [
      {
        id: 'd1',
        variant_id: 'v1',
        product_variant_name: 'L / Blue',
        product_id: 'p1',
        product_name: 'Product A',
        product_supplier_link: null,
        product_photo_url: null,
        ordered_qty: 2,
        received_qty: null,
        unit_price_foreign: '20.00',
        unit_price_base: 30000,
        discounted_unit_price_foreign: '15.00',
        discounted_unit_price_base: 22500,
        total_price_foreign: '40.00',
        total_price_base: 60000,
        discounted_total_price_foreign: '30.00',
        discounted_total_price_base: 45000,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 10,
        incoming_qty: 0,
        variant_values: { Color: 'Blue', Size: 'L' },
        last_unit_price_foreign: null,
        last_currency: null,
        last_discounted_unit_price_foreign: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
        product_dim1_key: null,
      },
    ],
  } satisfies PurchaseOrder

  const { container } = render(<PurchaseOrderExportPDF po={poWithDiscount} />)
  const allTexts = Array.from(container.querySelectorAll('[data-testid="pdf-text"]')).map(
    el => el.textContent,
  )
  // discounted total (30.00) should appear, not base total (40.00)
  expect(allTexts.some(t => t?.includes('30.00'))).toBe(true)
  expect(allTexts.every(t => !t?.includes('40.00'))).toBe(true)
})

it('groupBySubGroup with null groupByKey produces one sub-group per product with empty first_dim_value', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'L / Orange Clam', { Color: 'Orange Clam', Size: 'L' }),
    makeDetail('d2', 'p1', 'Product A', 'M / White Cherry', { Color: 'White Cherry', Size: 'M' }),
    makeDetail('d3', 'p2', 'Product B', 'L / Red', { Color: 'Red', Size: 'L' }),
  ]
  const sgs = groupBySubGroup(details, null)
  expect(sgs).toHaveLength(2)
  expect(sgs.every(sg => sg.first_dim_value === '')).toBe(true)
  const p1 = sgs.find(sg => sg.product_id === 'p1')!
  expect(p1.items).toHaveLength(2)
  expect(p1.key).toBe('p1::')
})

it('groupBySubGroup with explicit groupByKey groups by that dimension value', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'L / Orange Clam', { Color: 'Orange Clam', Size: 'L' }),
    makeDetail('d2', 'p1', 'Product A', 'M / Orange Clam', { Color: 'Orange Clam', Size: 'M' }),
    makeDetail('d3', 'p1', 'Product A', 'L / White Cherry', { Color: 'White Cherry', Size: 'L' }),
  ]
  const sgs = groupBySubGroup(details, 'Size')
  expect(sgs).toHaveLength(2)
  const lGroup = sgs.find(sg => sg.first_dim_value === 'L')!
  expect(lGroup.items).toHaveLength(2)
  expect(lGroup.key).toBe('p1::L')
  const mGroup = sgs.find(sg => sg.first_dim_value === 'M')!
  expect(mGroup.items).toHaveLength(1)
})

it('groupBySubGroup with a groupByKey absent from variant_values collapses all variants into one sub-group per product', () => {
  const details = [
    makeDetail('d1', 'p1', 'Product A', 'L / Red', { Color: 'Red', Size: 'L' }),
    makeDetail('d2', 'p1', 'Product A', 'M / Red', { Color: 'Red', Size: 'M' }),
  ]
  const sgs = groupBySubGroup(details, 'Weight')
  expect(sgs).toHaveLength(1)
  expect(sgs[0].first_dim_value).toBe('')
  expect(sgs[0].items).toHaveLength(2)
})

it('PDF renders distinct images per subgroup when imageMap is keyed by sg.key', () => {
  const details = [
    makeDetail('d1', 'p1', 'Widget', 'Red/S', { Warna: 'Merah', Ukuran: 'S' }),
    makeDetail('d2', 'p1', 'Widget', 'Blue/S', { Warna: 'Biru', Ukuran: 'S' }),
  ]
  const subGroups = groupBySubGroup(details, 'Warna')
  // sg.key format: `${product_id}::${first_dim_value}`
  const redKey = 'p1::Merah'
  const blueKey = 'p1::Biru'
  const imageMap: Record<string, string> = {
    [redKey]: 'data:image/png;base64,RED',
    [blueKey]: 'data:image/png;base64,BLUE',
  }
  render(
    <PurchaseOrderExportPDF
      po={{ ...mockPo, status: 'ORDERED', order_details: details }}
      subGroups={subGroups}
      imageMap={imageMap}
    />,
  )
  const images = screen.getAllByTestId('pdf-image') as HTMLImageElement[]
  const srcs = images.map(img => img.src)
  expect(srcs).toContain('data:image/png;base64,RED')
  expect(srcs).toContain('data:image/png;base64,BLUE')
  // Both images must be distinct — not the same src repeated
  expect(srcs[0]).not.toBe(srcs[1])
})

it('fetchPhotoViaProxy passes dim_key and dim_value query params when provided', async () => {
  const clientMock = (await import('../../../api/client')).default
  const getMock = vi.mocked(clientMock.get)
  getMock.mockResolvedValueOnce({ data: new Blob(['x'], { type: 'image/png' }) })
  const { fetchPhotoViaProxy: realFetch } = await import('../../../api/purchasing')
  await realFetch('p1', 'Warna', 'Putih')
  expect(getMock).toHaveBeenCalledWith(
    '/product/p1/photo-proxy/?dim_key=Warna&dim_value=Putih',
    expect.objectContaining({ responseType: 'blob' }),
  )
})

it('fetchPhotoViaProxy omits query params when dimKey is not provided', async () => {
  const clientMock = (await import('../../../api/client')).default
  const getMock = vi.mocked(clientMock.get)
  getMock.mockResolvedValueOnce({ data: new Blob(['x'], { type: 'image/png' }) })
  const { fetchPhotoViaProxy: realFetch } = await import('../../../api/purchasing')
  await realFetch('p1')
  expect(getMock).toHaveBeenCalledWith(
    '/product/p1/photo-proxy/',
    expect.objectContaining({ responseType: 'blob' }),
  )
})
