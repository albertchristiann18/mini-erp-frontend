import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { vi, it, expect } from "vitest"
import { StatusAdvanceModal } from "../../../components/modals/StatusAdvanceModal"
import type { PurchaseOrder, POStatus } from "../../../types/purchasing"

const mockCheckMutate = vi.fn()
const mockUpdateMutateAsync = vi.fn()
let mockCheckResult: { can_transition: boolean; target_status: POStatus; missing_fields: { field: string; label: string; section: string; message: string }[] }

vi.mock("../../../hooks/usePurchasing", () => ({
  useCheckPOTransition: () => ({
    mutate: mockCheckMutate,
    data: mockCheckResult,
    isPending: false,
  }),
  useUpdatePurchaseOrder: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}))

const mockPO: PurchaseOrder = {
  id: "01ABC",
  company: "c1",
  warehouse: "w1",
  warehouse_name: "Main WH",
  company_name: "Test Co",
  purchase_order_number: "PO-2026-001",
  status: "ORDERED",
  next_status: "SHIPPED",
  supplier_name: "Test Supplier",
  forwarder_name: "Test Forwarder",
  shop_services: "Taobao",
  commission_fee_pct: 5,
  commission_fee: 250000,
  commission_fee_rmb: "150.000",
  delivery_fee: "300.000",
  delivery_fee_idr: 675000000,
  currency: "CNY",
  exchange_rate: "2250.000",
  cbm: "1.500",
  weight: "5.000",
  shipping_fee_per_cbm: 3000000,
  shipping_fee: 4500000,
  total_ordered_qty: 10,
  total_received_qty: 0,
  total_item_amount: 4950000,
  total_order_amount: 5200000,
  total_amount: 5000000,
  procure_amount: 4750000,
  refund_amount: null,
  cost_ratio_cogs: 12.5,
  forecast_shipping_fee_per_cbm: null,
  shipping_per_qty: 25000,
  invoice_number: "INV-001",
  invoice_date: "2026-05-01",
  delivery_order_number: null,
  delivery_date: null,
  forecast_delivery_date: null,
  forecast_cbm: null,
  forecast_shipping_fee: null,
  purchase_order_invoice_file: "https://example.com/invoice.pdf",
  delivery_order_file: null,
  delivery_order_invoice_file: null,
  packing_list_file: null,
  note: null,
  editable_fields: {
    header: [],
    order_detail: [],
  },
  status_history: [],
  cdate: "2026-05-01T00:00:00Z",
  udate: "2026-05-01T00:00:00Z",
}

function renderModal(open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StatusAdvanceModal
        open={open}
        onClose={vi.fn()}
        po={mockPO}
        targetStatus="SHIPPED"
      />
    </QueryClientProvider>,
  )
}

it("renders target status in modal title", () => {
  mockCheckResult = { can_transition: true, target_status: "SHIPPED", missing_fields: [] }
  renderModal()
  expect(screen.getByText("Advance to SHIPPED")).toBeInTheDocument()
})

it("shows green checkmark for present fields", () => {
  mockCheckResult = { can_transition: true, target_status: "SHIPPED", missing_fields: [] }
  renderModal()
  const checks = screen.getAllByTestId("check-icon")
  expect(checks.length).toBeGreaterThan(0)
  const xIcons = screen.queryAllByTestId("x-icon")
  expect(xIcons.length).toBe(0)
})

it("shows red indicator for missing fields with editable input", () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "SHIPPED",
    missing_fields: [{ field: "delivery_order_number", label: "Delivery Order No.", section: "Logistics & Dates", message: "Delivery order no. is required when moving to SHIPPED." }],
  }
  renderModal()
  expect(screen.getByText("Delivery Order No.")).toBeInTheDocument()
  expect(screen.getByPlaceholderText("Delivery Order No.")).toBeInTheDocument()
})

it("Confirm button disabled when can_transition is false and no values filled", () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "SHIPPED",
    missing_fields: [{ field: "delivery_order_number", label: "Delivery Order No.", section: "Logistics & Dates", message: "Delivery order no. is required." }],
  }
  renderModal()
  const confirmBtn = screen.getByRole("button", { name: /confirm/i })
  expect(confirmBtn).toBeDisabled()
})

it("Confirm button enabled when can_transition is true", () => {
  mockCheckResult = { can_transition: true, target_status: "SHIPPED", missing_fields: [] }
  renderModal()
  const confirmBtn = screen.getByRole("button", { name: /confirm/i })
  expect(confirmBtn).not.toBeDisabled()
})

it("renders editable input for missing field", () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "SHIPPED",
    missing_fields: [{ field: "delivery_order_number", label: "Delivery Order No.", section: "Logistics & Dates", message: "Delivery order no. is required." }],
  }
  renderModal()
  const input = screen.getByPlaceholderText("Delivery Order No.")
  expect(input).toBeInTheDocument()
  expect(input).toHaveAttribute("type", "text")
})

it("Confirm button enabled after filling missing fields", () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "SHIPPED",
    missing_fields: [{ field: "delivery_order_number", label: "Delivery Order No.", section: "Logistics & Dates", message: "Delivery order no. is required." }],
  }
  renderModal()
  const confirmBtn = screen.getByRole("button", { name: /confirm/i })
  expect(confirmBtn).toBeDisabled()
  const input = screen.getByPlaceholderText("Delivery Order No.")
  fireEvent.change(input, { target: { value: "DO-001" } })
  expect(confirmBtn).not.toBeDisabled()
})
