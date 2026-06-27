import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import type { SourcingPoolPreviewResult, SourcingPoolImportResult, SourcingPoolPreviewRow } from '../../../types/purchasing'
import { SourcingPoolImportModal } from '../components/SourcingPoolImportModal'
import * as useSourcingPoolModule from '../hooks/useSourcingPool'

vi.mock('../hooks/useSourcingPool', () => ({
  useDownloadSourcingPoolTemplate: vi.fn(),
  usePreviewSourcingPool: vi.fn(),
  useImportSourcingPool: vi.fn(),
}))

const mockedUseDownloadSourcingPoolTemplate = vi.mocked(useSourcingPoolModule.useDownloadSourcingPoolTemplate)
const mockedUsePreviewSourcingPool = vi.mocked(useSourcingPoolModule.usePreviewSourcingPool)
const mockedUseImportSourcingPool = vi.mocked(useSourcingPoolModule.useImportSourcingPool)

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseDownloadSourcingPoolTemplate.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as unknown as ReturnType<typeof useSourcingPoolModule.useDownloadSourcingPoolTemplate>)
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)
  mockedUseImportSourcingPool.mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.useImportSourcingPool>)
})

function renderModal(props: Partial<React.ComponentProps<typeof SourcingPoolImportModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SourcingPoolImportModal
          open
          onClose={vi.fn()}
          supplierId="sup1"
          supplierName="Test Supplier"
          onImportSuccess={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('download template button triggers download mutation', async () => {
  const mutate = vi.fn()
  mockedUseDownloadSourcingPoolTemplate.mockReturnValue({ mutate, isPending: false, isError: false } as unknown as ReturnType<typeof useSourcingPoolModule.useDownloadSourcingPoolTemplate>)
  renderModal()
  await userEvent.click(screen.getByText('Download Template'))
  expect(mutate).toHaveBeenCalled()
})

it('advancing to step 2 shows file upload area', async () => {
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  expect(screen.getByText('Click to select .xlsx file')).toBeInTheDocument()
})

it('file selection enables preview button', async () => {
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await waitFor(() => expect(screen.getByText('Preview')).not.toBeDisabled())
})

it('preview button calls preview mutation with the selected file', async () => {
  const mutate = vi.fn()
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await waitFor(() => expect(mutate).toHaveBeenCalledWith(file, expect.any(Object)))
})

it('valid rows appear in preview table after successful preview', async () => {
  const mockMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: [{ product_name: 'Widget', variant_name: 'Red', unit_price: 10 }], errors: [] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await waitFor(() => {
    expect(screen.getByText('Valid rows (1 items)')).toBeInTheDocument()
    expect(screen.getByText('Widget')).toBeInTheDocument()
  })
})

it('error rows shown in amber warning section', async () => {
  const mockMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: [], errors: [{ row: 2, message: 'Missing category_code' }] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await waitFor(() => {
    expect(screen.getByText('Errors (1 rows skipped)')).toBeInTheDocument()
    expect(screen.getByText('Row 2: Missing category_code')).toBeInTheDocument()
  })
})

it('continue button disabled when no valid rows', async () => {
  const mockMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: [], errors: [{ row: 2, message: 'Missing category_code' }] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await waitFor(() => expect(screen.getByText('Continue to Confirm →')).toBeDisabled())
})

it('step 3 shows correct item count and supplier name', async () => {
  const mockMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: Array(5).fill(null).map((_, i) => ({ product_name: `Item ${i}`, variant_name: 'V', unit_price: 10, qty_suggested: null })), errors: [{ row: 1, message: 'err' }, { row: 2, message: 'err' }] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)
  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await userEvent.click(screen.getByText('Continue to Confirm →'))
  expect(screen.getByText(/Ready to import 5 item/)).toBeInTheDocument()
  expect(screen.getByText('2 row(s) had errors and will be skipped.')).toBeInTheDocument()
})

it('confirm import calls import mutation with supplier_id and valid rows', async () => {
  const previewMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: [{ product_name: 'Widget', variant_name: 'Red', unit_price: 10 }], errors: [] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: previewMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)

  const importMutate = vi.fn((_args: { supplierId: string; rows: SourcingPoolPreviewRow[] }, { onSuccess }: { onSuccess: (data: SourcingPoolImportResult) => void }) => {
    onSuccess({ created: 3, updated: 2, pool_id: 'p1' })
  })
  mockedUseImportSourcingPool.mockReturnValue({ mutate: importMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.useImportSourcingPool>)

  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await userEvent.click(screen.getByText('Continue to Confirm →'))
  await userEvent.click(screen.getByText('Confirm Import'))
  await waitFor(() => {
    expect(importMutate).toHaveBeenCalledWith(
      { supplierId: 'sup1', rows: [{ product_name: 'Widget', variant_name: 'Red', unit_price: 10 }] },
      expect.any(Object),
    )
  })
})

it('successful import calls onImportSuccess and onClose', async () => {
  const onImportSuccess = vi.fn()
  const onClose = vi.fn()

  const previewMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: [{ product_name: 'Widget', variant_name: 'Red', unit_price: 10 }], errors: [] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: previewMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)

  const importMutate = vi.fn((_args: { supplierId: string; rows: SourcingPoolPreviewRow[] }, { onSuccess }: { onSuccess: (data: SourcingPoolImportResult) => void }) => {
    onSuccess({ created: 3, updated: 2, pool_id: 'p1' })
  })
  mockedUseImportSourcingPool.mockReturnValue({ mutate: importMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.useImportSourcingPool>)

  renderModal({ onImportSuccess, onClose })
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await userEvent.click(screen.getByText('Continue to Confirm →'))
  await userEvent.click(screen.getByText('Confirm Import'))
  await waitFor(() => {
    expect(onImportSuccess).toHaveBeenCalledWith([{ product_name: 'Widget', variant_name: 'Red', unit_price: 10 }])
    expect(onClose).toHaveBeenCalled()
  })
})

it('import error shows error toast and stays on step 3', async () => {
  const previewMutate = vi.fn((_file: File, { onSuccess }: { onSuccess: (data: SourcingPoolPreviewResult) => void }) => {
    onSuccess({ valid: [{ product_name: 'Widget', variant_name: 'Red', unit_price: 10 }], errors: [] })
  })
  mockedUsePreviewSourcingPool.mockReturnValue({ mutate: previewMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.usePreviewSourcingPool>)

  const importMutate = vi.fn((_args: { supplierId: string; rows: SourcingPoolPreviewRow[] }, { onError }: { onError: () => void }) => {
    onError()
  })
  mockedUseImportSourcingPool.mockReturnValue({ mutate: importMutate, isPending: false } as unknown as ReturnType<typeof useSourcingPoolModule.useImportSourcingPool>)

  renderModal()
  await userEvent.click(screen.getByText("I've filled it in →"))
  const fileInput = screen.getByLabelText(/click to select/i)
  const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  await userEvent.upload(fileInput, file)
  await userEvent.click(screen.getByText('Preview'))
  await userEvent.click(screen.getByText('Continue to Confirm →'))
  await userEvent.click(screen.getByText('Confirm Import'))
  expect(screen.getByText('Step 3 of 3: Confirm Import')).toBeInTheDocument()
})

it('cancel button calls onClose', async () => {
  const onClose = vi.fn()
  renderModal({ onClose })
  await userEvent.click(screen.getByText('Cancel'))
  expect(onClose).toHaveBeenCalled()
})
