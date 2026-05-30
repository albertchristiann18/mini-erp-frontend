import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { vi, it, expect, beforeEach } from "vitest"
import PurchaseOrderDetailPage from "../PurchaseOrderDetailPage"

const mockMutateAsync = vi.fn()

let mockUser: { is_staff: boolean } | null = { is_staff: true }
let mockPoStatus = "DRAFT"

vi.mock("../../../hooks/usePurchasing", () => ({
  usePurchaseOrder: () => ({
    data: {
      id: "01ABC",
      purchase_order_number: "PO-2026-001",
      get status() { return mockPoStatus },
      supplier_name: "Test Supplier",
      forwarder_name: "Test Forwarder",
      total_amount: 5000000,
      cost_ratio_cogs: 12.5,
      shipping_per_qty: 25000,
      exchange_rate: "2250.000",
      cbm: "1.500",
      forecast_delivery_date: "2026-08-01",
      forecast_cbm: null,
      forecast_shipping_fee: null,
      invoice_number: "INV-001",
      invoice_date: "2026-05-01",
      delivery_date: null,
      delivery_order_number: null,
      purchase_order_invoice_file: "https://example.com/invoice.pdf",
      delivery_order_file: null,
      delivery_order_invoice_file: null,
      packing_list_file: null,
      order_details: [
        {
          id: "det1",
          product_variant: "v1",
          product_variant_name: "Blue / M",
          ordered_qty: 10,
          received_qty: null,
          unit_price_foreign: "25.000",
          discounted_unit_price_foreign: "22.000",
          total_price_base: 562500,
          discounted_total_price_base: 495000,
          unit_price_base: 56250,
          discounted_unit_price_base: 49500,
          total_price_foreign: "250.000",
          discounted_total_price_foreign: "220.000",
          remarks: "",
        },
      ],
      company: "c1",
      warehouse: "w1",
      warehouse_name: "Main WH",
      company_name: "Test Co",
      shop_services: "Taobao",
      commission_fee_pct: 5,
      commission_fee: 250000,
      commission_fee_rmb: "150.000",
      delivery_fee: "300.000",
      currency: "CNY",
      weight: "5.000",
      shipping_fee_per_cbm: 3000000,
      shipping_fee: 4500000,
      procure_amount: 4750000,
      refund_amount: null,
      total_ordered_qty: 10,
      total_received_qty: 0,
      total_item_amount: 4950000,
      total_order_amount: 5200000,
      next_status: null,
      status_history: [],
      cdate: "2026-05-01T00:00:00Z",
      udate: "2026-05-01T00:00:00Z",
    },
    isLoading: false,
  }),
  useUpdatePurchaseOrder: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useAdvancePOStatus: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock("../../../hooks/useInventory", () => ({
  useProductVariants: () => ({ data: { results: [] } }),
}))

beforeEach(() => {
  mockUser = { is_staff: true }
  mockPoStatus = "DRAFT"
  mockMutateAsync.mockReset()
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/purchasing/orders/01ABC"]}>
        <Routes>
          <Route path="/purchasing/orders/:id" element={<PurchaseOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it("renders Edit button for staff users when status is DRAFT", async () => {
  renderPage()
  expect(await screen.findByText("Edit")).toBeInTheDocument()
})

it("does not render Edit button for non-staff users", async () => {
  mockUser = { is_staff: false }
  renderPage()
  await screen.findByText("PO-2026-001")
  expect(screen.queryByText("Edit")).not.toBeInTheDocument()
})

it("does not render Edit button when status is COMPLETED", async () => {
  mockPoStatus = "COMPLETED"
  renderPage()
  await screen.findByText("PO-2026-001")
  expect(screen.queryByText("Edit")).not.toBeInTheDocument()
})

it("opens modal when Edit button clicked", async () => {
  renderPage()
  const editBtn = await screen.findByText("Edit")
  await userEvent.click(editBtn)
  expect(await screen.findByText(/Edit PO-2026-001/)).toBeInTheDocument()
})

it("exchange_rate input is disabled when status is ORDERED", async () => {
  mockPoStatus = "ORDERED"
  renderPage()
  const editBtn = await screen.findByText("Edit")
  await userEvent.click(editBtn)
  expect(await screen.findByText(/Edit PO-2026-001/)).toBeInTheDocument()
  await screen.findByText(/Edit PO-2026-001/)
  const exchangeRateInput = screen.getByRole<HTMLInputElement>("spinbutton", { name: /exchange rate/i })
  expect(exchangeRateInput.disabled).toBe(true)
})
