import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { vi, it, expect, describe } from "vitest"
import { StatusAdvanceModal } from "../StatusAdvanceModal"
import { toast } from "../../../lib/toast"
import type { PurchaseOrder, PurchaseOrderDetail, POStatus } from "../../../types/purchasing"

const mockCheckMutate = vi.fn()
const mockUpdateMutateAsync = vi.fn()
let mockCheckResult: { can_transition: boolean; target_status: POStatus; missing_fields: { field: string; label: string; section: string; message: string }[] }

vi.mock("../../../hooks/api/usePurchasing", () => ({
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

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
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
  supplier_id: null,
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
  has_discount: false,
  editable_fields: {
    header: [],
    order_detail: [],
  },
  status_history: [],
  cdate: "2026-05-01T00:00:00Z",
  udate: "2026-05-01T00:00:00Z",
}

function makeDetail(overrides: Partial<PurchaseOrderDetail> & { id: string }): PurchaseOrderDetail {
  return {
    variant_id: overrides.id,
    product_variant_name: `Variant ${overrides.id}`,
    sku_variant_code: undefined,
    product_id: "p1",
    product_name: "Product",
    product_supplier_link: null,
    product_photo_url: null,
    ordered_qty: 10,
    received_qty: 10,
    unit_price_foreign: null,
    unit_price_base: null,
    discounted_unit_price_foreign: null,
    discounted_unit_price_base: null,
    total_price_foreign: null,
    total_price_base: null,
    discounted_total_price_foreign: null,
    discounted_total_price_base: null,
    remarks: "",
    avg_sales: null,
    avg_sales_7d: null,
    stock_on_hand: 0,
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
    ...overrides,
  }
}

function renderModal(open = true, targetStatus: POStatus = "SHIPPED", po: PurchaseOrder = mockPO) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StatusAdvanceModal
        open={open}
        onClose={vi.fn()}
        po={po}
        targetStatus={targetStatus}
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

const poWithoutCurrency: PurchaseOrder = { ...mockPO, currency: null }

it("renders currency select for ORDERED target status", () => {
  mockCheckResult = { can_transition: true, target_status: "ORDERED", missing_fields: [] }
  renderModal(true, "ORDERED")
  expect(screen.getByTestId("currency-select-trigger")).toBeInTheDocument()
})

it("shows red indicator for missing currency reported by check_transition", () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "ORDERED",
    missing_fields: [{ field: "currency", label: "Currency", section: "Financial Setup", message: "Currency is required when moving to ORDERED." }],
  }
  renderModal(true, "ORDERED", poWithoutCurrency)
  expect(screen.getByText("Currency")).toBeInTheDocument()
  expect(screen.getAllByTestId("x-icon").length).toBeGreaterThan(0)
})

it("Confirm button disabled until a currency is chosen for ORDERED", () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "ORDERED",
    missing_fields: [{ field: "currency", label: "Currency", section: "Financial Setup", message: "Currency is required when moving to ORDERED." }],
  }
  renderModal(true, "ORDERED", poWithoutCurrency)
  const confirmBtn = screen.getByRole("button", { name: /confirm/i })
  expect(confirmBtn).toBeDisabled()
})

it("Confirm button enabled after selecting a currency for ORDERED", async () => {
  mockCheckResult = {
    can_transition: false,
    target_status: "ORDERED",
    missing_fields: [{ field: "currency", label: "Currency", section: "Financial Setup", message: "Currency is required when moving to ORDERED." }],
  }
  renderModal(true, "ORDERED", poWithoutCurrency)
  const confirmBtn = screen.getByRole("button", { name: /confirm/i })
  expect(confirmBtn).toBeDisabled()

  const currencyTrigger = screen.getByTestId("currency-select-trigger")
  await userEvent.click(currencyTrigger)
  const cnyOption = await screen.findByText("CNY (¥ Yuan)")
  await userEvent.click(cnyOption)

  expect(confirmBtn).not.toBeDisabled()
})

describe("COMPLETED transition — editable received qty", () => {
  it("defaults to showing only rows where received qty differs from ordered qty, with a Show all control", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [
        makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8 }),
        makeDetail({ id: "d2", ordered_qty: 5, received_qty: 5 }),
      ],
    }
    renderModal(true, "COMPLETED", po)

    expect(screen.getByText("Variant d1")).toBeInTheDocument()
    expect(screen.queryByText("Variant d2")).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("Show all 2 items"))
    expect(screen.getByText("Variant d2")).toBeInTheDocument()
  })

  it("renders every row directly, with no Show all toggle, once flagged rows exceed 20", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const flagged = Array.from({ length: 21 }, (_, i) =>
      makeDetail({ id: `f${i}`, ordered_qty: 10, received_qty: 5 }),
    )
    const matched = makeDetail({ id: "m1", ordered_qty: 3, received_qty: 3 })
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [...flagged, matched],
    }
    renderModal(true, "COMPLETED", po)

    expect(screen.getByText("Variant m1")).toBeInTheDocument()
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument()
  })

  it("recomputes the discrepancy warning live as qty is edited", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 10 })],
    }
    renderModal(true, "COMPLETED", po)

    expect(screen.queryByText(/Warning/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("Show all 1 items"))
    const input = screen.getByDisplayValue("10")
    fireEvent.change(input, { target: { value: "7" } })

    expect(screen.getByText(/Warning/)).toBeInTheDocument()
    expect(screen.getByText(/Variant d1: received 7 of 10/)).toBeInTheDocument()
  })

  it("shows a distinct over-receipt warning (not the under-receipt one) when an item is over-received", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [
        makeDetail({ id: "d1", ordered_qty: 10, received_qty: 10, remarks: "" }),
        makeDetail({ id: "d2", ordered_qty: 5, received_qty: 5 }),
      ],
    }
    renderModal(true, "COMPLETED", po)

    fireEvent.click(screen.getByText("Show all 2 items"))
    const input = screen.getByDisplayValue("10")
    fireEvent.change(input, { target: { value: "12" } })

    expect(screen.getByText(/greater than ordered qty/)).toBeInTheDocument()
    expect(screen.queryByText(/less than ordered qty/)).not.toBeInTheDocument()
    expect(screen.getByText(/Variant d1: received 12 of 10/)).toBeInTheDocument()
  })

  it("does not show a warning for an over-receipt row's remarks-satisfied confirm-anyway line while remarks is still unresolved", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 40, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)

    expect(screen.getByText(/greater than ordered qty/)).toBeInTheDocument()
    expect(screen.queryByText(/You can still confirm/)).not.toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    expect(confirmBtn).toBeDisabled()
  })

  it("shows the confirm-anyway reassurance for an over-receipt row once its remarks is filled", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 40, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)

    fireEvent.change(screen.getByPlaceholderText("Remarks..."), { target: { value: "Extra units from supplier" } })

    expect(screen.getByText(/You can still confirm/)).toBeInTheDocument()
    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    expect(confirmBtn).not.toBeDisabled()
  })

  it("shows no warning at all for a row whose received qty matches ordered qty", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 10 })],
    }
    renderModal(true, "COMPLETED", po)

    expect(screen.queryByText(/Warning/)).not.toBeInTheDocument()
  })

  it("sends the edited received_qty via useUpdatePurchaseOrder alongside the status change on confirm", async () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    mockUpdateMutateAsync.mockResolvedValue({})
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8 })],
    }
    renderModal(true, "COMPLETED", po)

    const input = screen.getByDisplayValue("8")
    fireEvent.change(input, { target: { value: "10" } })

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    await userEvent.click(confirmBtn)

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: po.id,
      data: expect.objectContaining({
        status: "COMPLETED",
        order_details: [{ id: "d1", received_qty: 10 }],
      }),
    })
  })
})

describe("COMPLETED transition — remarks for qty discrepancy", () => {
  it("renders a remarks input only for the discrepant row, not the row where received qty matches ordered qty", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8 }), makeDetail({ id: "d2", ordered_qty: 5, received_qty: 5 })],
    }
    renderModal(true, "COMPLETED", po)
    fireEvent.click(screen.getByText("Show all 2 items"))

    expect(screen.queryByPlaceholderText("Remarks...")).toBeInTheDocument()
    expect(screen.queryAllByPlaceholderText("Remarks...")).toHaveLength(1)
  })

  it("renders a remarks input for an under-receipt row and gates Confirm until it is filled", async () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)

    const remarksInput = screen.getByPlaceholderText("Remarks...")
    expect(remarksInput).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    expect(confirmBtn).toBeDisabled()

    fireEvent.change(remarksInput, { target: { value: "Short shipped by supplier" } })
    expect(confirmBtn).not.toBeDisabled()
  })

  it("renders a remarks input for an over-receipt row (not just under-receipt)", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 10, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)
    fireEvent.click(screen.getByText("Show all 1 items"))

    expect(screen.queryByPlaceholderText("Remarks...")).not.toBeInTheDocument()

    const qtyInput = screen.getByDisplayValue("10")
    fireEvent.change(qtyInput, { target: { value: "12" } })

    const remarksInput = screen.getByPlaceholderText("Remarks...")
    expect(remarksInput).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    expect(confirmBtn).toBeDisabled()
  })

  it("does not require a fresh remarks entry when the row's already-stored remarks is non-empty", () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8, remarks: "Already noted last week" })],
    }
    renderModal(true, "COMPLETED", po)

    const remarksInput = screen.getByPlaceholderText("Remarks...") as HTMLInputElement
    expect(remarksInput.value).toBe("Already noted last week")

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    expect(confirmBtn).not.toBeDisabled()
  })

  it("includes remarks in the order_details payload alongside received_qty on confirm", async () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    mockUpdateMutateAsync.mockResolvedValue({})
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)

    const remarksInput = screen.getByPlaceholderText("Remarks...")
    fireEvent.change(remarksInput, { target: { value: "Box damaged in transit" } })

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    await userEvent.click(confirmBtn)

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: po.id,
      data: expect.objectContaining({
        status: "COMPLETED",
        order_details: [{ id: "d1", remarks: "Box damaged in transit" }],
      }),
    })
  })

  it("sends both received_qty and remarks when both are edited for a discrepant row", async () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    mockUpdateMutateAsync.mockResolvedValue({})
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 10, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)
    fireEvent.click(screen.getByText("Show all 1 items"))

    const qtyInput = screen.getByDisplayValue("10")
    fireEvent.change(qtyInput, { target: { value: "7" } })

    const remarksInput = screen.getByPlaceholderText("Remarks...")
    fireEvent.change(remarksInput, { target: { value: "Partial delivery" } })

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    await userEvent.click(confirmBtn)

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: po.id,
      data: expect.objectContaining({
        status: "COMPLETED",
        order_details: [{ id: "d1", received_qty: 7, remarks: "Partial delivery" }],
      }),
    })
  })

  it("surfaces the real backend field error if a remarks-missing submission somehow reaches the server", async () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    mockUpdateMutateAsync.mockRejectedValue({
      status: 400,
      message: "Validation failed.",
      fieldErrors: {
        order_details: "Remarks is required for Variant d1 when moving to COMPLETED status with partial delivery (received_qty: 8, ordered_qty: 10).",
      },
    })
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 10, received_qty: 8, remarks: "already there" })],
    }
    renderModal(true, "COMPLETED", po)

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    await userEvent.click(confirmBtn)

    expect(vi.mocked(toast).error).toHaveBeenCalledWith(
      "Remarks is required for Variant d1 when moving to COMPLETED status with partial delivery (received_qty: 8, ordered_qty: 10).",
    )
  })
})

describe("Confirm error handling — surfaces normalized ApiError", () => {
  it("toasts the order_details field error over the generic message when fieldErrors is present", async () => {
    mockCheckResult = { can_transition: true, target_status: "COMPLETED", missing_fields: [] }
    mockUpdateMutateAsync.mockRejectedValue({
      status: 400,
      message: "Validation failed.",
      fieldErrors: {
        order_details:
          "Remarks is required for Black/M when moving to COMPLETED status with partial delivery (received_qty: 4, ordered_qty: 20).",
      },
    })
    const po: PurchaseOrder = {
      ...mockPO,
      status: "DELIVERED",
      order_details: [makeDetail({ id: "d1", ordered_qty: 20, received_qty: 4, remarks: "" })],
    }
    renderModal(true, "COMPLETED", po)

    // Fill remarks so the new client-side gate doesn't block the click before this
    // fallback (real-backend-error) path can be exercised.
    fireEvent.change(screen.getByPlaceholderText("Remarks..."), { target: { value: "Partial delivery" } })

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    await userEvent.click(confirmBtn)

    expect(vi.mocked(toast).error).toHaveBeenCalledWith(
      "Remarks is required for Black/M when moving to COMPLETED status with partial delivery (received_qty: 4, ordered_qty: 20).",
    )
  })

  it("falls back to err.message when there are no fieldErrors", async () => {
    mockCheckResult = { can_transition: true, target_status: "SHIPPED", missing_fields: [] }
    mockUpdateMutateAsync.mockRejectedValue({
      status: 0,
      message: "Network error. Please check your connection.",
    })
    renderModal(true, "SHIPPED")

    const confirmBtn = screen.getByRole("button", { name: /confirm/i })
    await userEvent.click(confirmBtn)

    expect(vi.mocked(toast).error).toHaveBeenCalledWith("Network error. Please check your connection.")
  })
})
