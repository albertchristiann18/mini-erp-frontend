import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, beforeEach, describe } from 'vitest'
import { createElement } from 'react'

vi.mock('../../../hooks/purchasing/useSourcingPool', () => ({
  useDownloadSourcingPoolTemplate: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePreviewSourcingPool: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useImportAndAdd: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpsertColorAbbreviation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useResolveSourcingConflicts: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import {
  usePreviewSourcingPool,
  useImportAndAdd,
} from '../../../hooks/purchasing/useSourcingPool'
import { toast } from '../../../lib/toast'
import { useSourcingImportWizard } from '../../../hooks/purchasing/useSourcingImportWizard'

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const defaultProps = {
  poId: 'po-1',
  supplierId: 'sup-1',
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('initial state', () => {
  it('starts on the download step', () => {
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    expect(result.current.step).toBe('download')
  })

  it('selectedFile starts null', () => {
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    expect(result.current.selectedFile).toBeNull()
  })

  it('previewResult starts null', () => {
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    expect(result.current.previewResult).toBeNull()
  })
})

describe('handleClose', () => {
  it('resets step to download and calls onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(
      () => useSourcingImportWizard({ ...defaultProps, onClose }),
      { wrapper: createWrapper() },
    )
    act(() => {
      result.current.setStep('upload')
    })
    expect(result.current.step).toBe('upload')
    act(() => {
      result.current.handleClose()
    })
    expect(result.current.step).toBe('download')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('resets selectedFile on close', () => {
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setSelectedFile(new File(['x'], 'test.xlsx'))
    })
    expect(result.current.selectedFile).not.toBeNull()
    act(() => {
      result.current.handleClose()
    })
    expect(result.current.selectedFile).toBeNull()
  })
})

describe('handlePreview', () => {
  it('does nothing when selectedFile is null', () => {
    const previewMutate = vi.fn()
    vi.mocked(usePreviewSourcingPool).mockReturnValue({
      mutate: previewMutate,
      isPending: false,
    } as unknown as ReturnType<typeof usePreviewSourcingPool>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.handlePreview()
    })
    expect(previewMutate).not.toHaveBeenCalled()
  })

  it('calls previewMutation.mutate with the selected file', () => {
    const previewMutate = vi.fn()
    vi.mocked(usePreviewSourcingPool).mockReturnValue({
      mutate: previewMutate,
      isPending: false,
    } as unknown as ReturnType<typeof usePreviewSourcingPool>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    const file = new File(['data'], 'sourcing.xlsx')
    act(() => {
      result.current.setSelectedFile(file)
    })
    act(() => {
      result.current.handlePreview()
    })
    expect(previewMutate).toHaveBeenCalledWith(file, expect.any(Object))
  })

  it('sets previewResult on success', () => {
    const previewData = {
      valid: [{ row: 1, variant_name: 'Red', unit_price: '10', qty_suggested: 5 }],
      errors: [],
      dim_mismatches: [],
      missing_colors: [],
      missing_product_names: [],
    }
    vi.mocked(usePreviewSourcingPool).mockReturnValue({
      mutate: vi.fn((_file, callbacks) => {
        callbacks?.onSuccess?.(previewData)
      }),
      isPending: false,
    } as unknown as ReturnType<typeof usePreviewSourcingPool>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setSelectedFile(new File(['x'], 'test.xlsx'))
    })
    act(() => {
      result.current.handlePreview()
    })
    expect(result.current.previewResult).toEqual(previewData)
  })

  it('shows error toast on preview failure', () => {
    vi.mocked(usePreviewSourcingPool).mockReturnValue({
      mutate: vi.fn((_file, callbacks) => {
        callbacks?.onError?.({})
      }),
      isPending: false,
    } as unknown as ReturnType<typeof usePreviewSourcingPool>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setSelectedFile(new File(['x'], 'test.xlsx'))
    })
    act(() => {
      result.current.handlePreview()
    })
    expect(toast.error).toHaveBeenCalledWith('Failed to parse file. Make sure you used the template.')
  })
})

describe('callImport', () => {
  it('calls importAndAdd mutation with rows and supplierId', () => {
    const importMutate = vi.fn()
    vi.mocked(useImportAndAdd).mockReturnValue({
      mutate: importMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useImportAndAdd>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setPreviewResult({
        valid: [{ row: 1, variant_name: 'Red', unit_price: '10', qty_suggested: 5 }],
        errors: [],
        dim_mismatches: [],
        missing_colors: [],
        missing_product_names: [],
      })
    })
    act(() => {
      result.current.callImport()
    })
    expect(importMutate).toHaveBeenCalledWith(
      {
        poId: 'po-1',
        data: {
          supplier_id: 'sup-1',
          rows: [{ row: 1, variant_name: 'Red', unit_price: '10', qty_suggested: 5 }],
          dim_mismatch_resolutions: {},
        },
      },
      expect.any(Object),
    )
  })

  it('sets step to result when no sku_conflicts', () => {
    vi.mocked(useImportAndAdd).mockReturnValue({
      mutate: vi.fn((_opts, callbacks) => {
        callbacks?.onSuccess?.({ added: [{ item_id: 'i1', po_detail_id: 'pd-1', product_name: 'P', variant_name: 'R' }], skipped: [], sku_conflicts: [] })
      }),
      isPending: false,
    } as unknown as ReturnType<typeof useImportAndAdd>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setPreviewResult({
        valid: [{ row: 1, variant_name: 'Red', unit_price: '10', qty_suggested: 5 }],
        errors: [],
        dim_mismatches: [],
        missing_colors: [],
        missing_product_names: [],
      })
    })
    act(() => {
      result.current.callImport()
    })
    expect(result.current.step).toBe('result')
  })

  it('sets step to resolve_conflicts when sku_conflicts present', () => {
    vi.mocked(useImportAndAdd).mockReturnValue({
      mutate: vi.fn((_opts, callbacks) => {
        callbacks?.onSuccess?.({
          added: [],
          skipped: [],
          sku_conflicts: [{ row_key: 'row-1', row: { row: 1, variant_name: 'Red', unit_price: '10' }, variant_code: 'ABC-001', sku_code: 'ABC-001', existing_product_id: 'p1', existing_product_name: 'Existing' }],
        })
      }),
      isPending: false,
    } as unknown as ReturnType<typeof useImportAndAdd>)
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setPreviewResult({
        valid: [{ row: 1, variant_name: 'Red', unit_price: '10', qty_suggested: 5 }],
        errors: [],
        dim_mismatches: [],
        missing_colors: [],
        missing_product_names: [],
      })
    })
    act(() => {
      result.current.callImport()
    })
    expect(result.current.step).toBe('resolve_conflicts')
  })
})

describe('computed values', () => {
  it('totalAdded sums addResult and resolveResult added arrays', () => {
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setAddResult({
        added: [{ item_id: 'i1', po_detail_id: 'pd-1', product_name: 'P', variant_name: 'R' }],
        skipped: [],
        sku_conflicts: [],
      })
      result.current.setResolveResult({
        added: [{ item_id: 'i2', po_detail_id: 'pd-2', product_name: 'P2', variant_name: 'B' }],
        skipped: [],
      })
    })
    expect(result.current.totalAdded).toBe(2)
  })

  it('allSkipped merges addResult and resolveResult skipped arrays', () => {
    const { result } = renderHook(() => useSourcingImportWizard(defaultProps), {
      wrapper: createWrapper(),
    })
    act(() => {
      result.current.setAddResult({
        added: [],
        skipped: [{ item_id: 's1', product_name: 'P', variant_name: 'R', reason: 'dup' }],
        sku_conflicts: [],
      })
      result.current.setResolveResult({
        added: [],
        skipped: [{ item_id: 's2', product_name: 'P2', variant_name: 'B', reason: 'no match' }],
      })
    })
    expect(result.current.allSkipped).toHaveLength(2)
  })
})
