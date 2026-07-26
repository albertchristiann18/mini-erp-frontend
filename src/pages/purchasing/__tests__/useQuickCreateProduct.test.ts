/**
 * renderHook tests for useQuickCreateProduct.
 * Seam: the hook's public interface (state + actions).
 */
import { renderHook, act } from '@testing-library/react'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import { useQuickCreateProduct } from '../../../hooks/purchasing/useQuickCreateProduct'

const mockCreateProduct = vi.fn()
const mockUploadPhoto = vi.fn()

vi.mock('../../../hooks/api/useInventory', () => ({
  useCreateProduct: () => ({ mutateAsync: mockCreateProduct, isPending: false }),
  useSuppliers: () => ({ data: { results: [] } }),
  useUploadAnyProductPhoto: () => ({ mutateAsync: mockUploadPhoto }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { company_id: 'company-123', is_staff: true } }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderQuickCreate(supplierId?: string) {
  return renderHook(() =>
    useQuickCreateProduct({ onClose: vi.fn(), onCreated: vi.fn(), supplierId }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('initial state', () => {
  it('starts on form step', () => {
    const { result } = renderQuickCreate()
    expect(result.current.step).toBe('form')
  })

  it('productName starts empty', () => {
    const { result } = renderQuickCreate()
    expect(result.current.productName).toBe('')
  })

  it('dimensionRows starts empty', () => {
    const { result } = renderQuickCreate()
    expect(result.current.dimensionRows).toEqual([])
  })

  it('errors starts empty', () => {
    const { result } = renderQuickCreate()
    expect(result.current.errors).toEqual({})
  })

  it('isSubmitting starts false', () => {
    const { result } = renderQuickCreate()
    expect(result.current.isSubmitting).toBe(false)
  })

  it('exposes supplierOptions from useSuppliers', () => {
    const { result } = renderQuickCreate()
    expect(result.current.supplierOptions).toEqual([])
  })
})

describe('handleClose', () => {
  it('resets all state and calls onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() =>
      useQuickCreateProduct({ onClose, onCreated: vi.fn() }),
    )

    act(() => {
      result.current.setProductName('Some product')
    })
    expect(result.current.productName).toBe('Some product')

    act(() => {
      result.current.handleClose()
    })

    expect(result.current.productName).toBe('')
    expect(result.current.step).toBe('form')
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('addDimensionRow', () => {
  it('adds a new dimension row with empty name and values', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
    })
    expect(result.current.dimensionRows).toHaveLength(1)
    expect(result.current.dimensionRows[0].name).toBe('')
    expect(result.current.dimensionRows[0].values).toEqual([])
  })
})

describe('removeDimensionRow', () => {
  it('removes the row at the given index', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
    })
    act(() => {
      result.current.updateDimensionName(0, 'Color')
      result.current.addDimensionRow()
    })
    act(() => {
      result.current.updateDimensionName(1, 'Size')
    })
    act(() => {
      result.current.removeDimensionRow(0)
    })
    expect(result.current.dimensionRows).toHaveLength(1)
    expect(result.current.dimensionRows[0].name).toBe('Size')
  })
})

describe('updateDimensionName', () => {
  it('updates the name of the row at the given index', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
    })
    act(() => {
      result.current.updateDimensionName(0, 'Color')
    })
    expect(result.current.dimensionRows[0].name).toBe('Color')
  })
})

describe('updateDimensionInputValue', () => {
  it('updates the inputValue for the given row', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
    })
    act(() => {
      result.current.updateDimensionInputValue(0, 'Red')
    })
    expect(result.current.dimensionRows[0].inputValue).toBe('Red')
  })
})

describe('addValueToDimension', () => {
  it('adds a chip with auto-generated code from inputValue', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
      result.current.updateDimensionInputValue(0, 'Red')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    expect(result.current.dimensionRows[0].values).toHaveLength(1)
    expect(result.current.dimensionRows[0].values[0].label).toBe('Red')
    expect(result.current.dimensionRows[0].values[0].code).toBe('RED')
    expect(result.current.dimensionRows[0].inputValue).toBe('')
  })

  it('does not add duplicate labels', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
      result.current.updateDimensionInputValue(0, 'Red')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    act(() => {
      result.current.updateDimensionInputValue(0, 'Red')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    expect(result.current.dimensionRows[0].values).toHaveLength(1)
  })

  it('does nothing when inputValue is empty', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    expect(result.current.dimensionRows[0].values).toHaveLength(0)
  })
})

describe('removeValueFromDimension', () => {
  it('removes the chip at the given value index', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
      result.current.updateDimensionInputValue(0, 'Red')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    act(() => {
      result.current.removeValueFromDimension(0, 0)
    })
    expect(result.current.dimensionRows[0].values).toHaveLength(0)
  })
})

describe('updateValueCode', () => {
  it('updates the code on the chip at dimIdx/valIdx, uppercasing and stripping non-alphanumeric', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.addDimensionRow()
      result.current.updateDimensionInputValue(0, 'Red')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    act(() => {
      result.current.updateValueCode(0, 0, 'r-1')
    })
    expect(result.current.dimensionRows[0].values[0].code).toBe('R1')
  })
})

describe('validate', () => {
  it('returns false and sets errors when productName is empty', () => {
    const { result } = renderQuickCreate()
    let valid: boolean
    act(() => {
      valid = result.current.validate()
    })
    expect(valid!).toBe(false)
    expect(result.current.errors.productName).toBe('Product name is required')
  })

  it('returns false when categoryId is empty', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.setProductName('Shoes')
    })
    let valid: boolean
    act(() => {
      valid = result.current.validate()
    })
    expect(valid!).toBe(false)
    expect(result.current.errors.categoryId).toBe('Category is required')
  })

  it('returns true when name and category are set and no dimensions', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
    })
    let valid: boolean
    act(() => {
      valid = result.current.validate()
    })
    expect(valid!).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it('validates dimension rows — name required', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
      result.current.addDimensionRow()
    })
    let valid: boolean
    act(() => {
      valid = result.current.validate()
    })
    expect(valid!).toBe(false)
    expect(result.current.errors['dim_0_name']).toBe('Dimension name is required')
  })

  it('validates dimension rows — at least one value required', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
      result.current.addDimensionRow()
      result.current.updateDimensionName(0, 'Color')
    })
    let valid: boolean
    act(() => {
      valid = result.current.validate()
    })
    expect(valid!).toBe(false)
    expect(result.current.errors['dim_0_values']).toBe('At least one value required')
  })

  it('detects duplicate SKU codes across dimension values', () => {
    const { result } = renderQuickCreate()
    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
      result.current.addDimensionRow()
      result.current.updateDimensionName(0, 'Color')
      result.current.updateDimensionInputValue(0, 'Red')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    act(() => {
      result.current.updateDimensionInputValue(0, 'Blue')
    })
    act(() => {
      result.current.addValueToDimension(0)
    })
    // Force both codes to be the same
    act(() => {
      result.current.updateValueCode(0, 1, 'RED')
    })
    let valid: boolean
    act(() => {
      valid = result.current.validate()
    })
    expect(valid!).toBe(false)
    expect(result.current.errors['sku_duplicate']).toContain('Duplicate code')
  })
})

describe('handleSubmit — success path (single variant)', () => {
  it('calls createProduct with correct payload and calls onCreated, then resets', async () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    mockCreateProduct.mockResolvedValue({
      id: 'prod1',
      name: 'Shoes',
      variants: [{ id: 'v1', name: 'Default', sku_variant_code: 'DEFAULT' }],
    })

    const { result } = renderHook(() =>
      useQuickCreateProduct({ onClose, onCreated }),
    )

    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Shoes',
        category_id: 'cat1',
        variant_options: {},
        variants: [],
      }),
    )
    expect(onCreated).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'v1', label: 'Default (DEFAULT)' }),
    ])
    expect(onClose).toHaveBeenCalled()
    expect(result.current.productName).toBe('')
  })
})

describe('handleSubmit — success path (multi-variant goes to pick step)', () => {
  it('transitions to pick step when 2+ variants returned', async () => {
    mockCreateProduct.mockResolvedValue({
      id: 'prod1',
      name: 'Shoes',
      variants: [
        { id: 'v1', name: 'Red / S', sku_variant_code: 'RED-S' },
        { id: 'v2', name: 'Red / M', sku_variant_code: 'RED-M' },
      ],
    })

    const { result } = renderHook(() =>
      useQuickCreateProduct({ onClose: vi.fn(), onCreated: vi.fn() }),
    )

    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.step).toBe('pick')
    expect(result.current.createdVariants).toHaveLength(2)
  })
})

describe('handleSubmit — error path', () => {
  it('sets skuError when response contains sku_variant_code', async () => {
    mockCreateProduct.mockRejectedValue({
      status: 400,
      message: 'Validation failed.',
      fieldErrors: { sku_variant_code: 'already exists' },
    })

    const { result } = renderHook(() =>
      useQuickCreateProduct({ onClose: vi.fn(), onCreated: vi.fn() }),
    )

    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.skuError).toBeTruthy()
    expect(result.current.skuError).toContain('variant codes already exist')
  })
})

describe('handleAddSelected (pick step)', () => {
  it('calls onCreated with only the selected variants', async () => {
    const onCreated = vi.fn()
    mockCreateProduct.mockResolvedValue({
      id: 'prod1',
      name: 'Shoes',
      variants: [
        { id: 'v1', name: 'Red / S', sku_variant_code: 'RED-S' },
        { id: 'v2', name: 'Red / M', sku_variant_code: 'RED-M' },
      ],
    })

    const { result } = renderHook(() =>
      useQuickCreateProduct({ onClose: vi.fn(), onCreated }),
    )

    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    // Deselect v2
    act(() => {
      result.current.toggleSelectedId('v2')
    })

    act(() => {
      result.current.handleAddSelected()
    })

    expect(onCreated).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'v1' }),
    ])
  })
})

describe('supplierId prop', () => {
  it('includes supplierId in the createProduct payload when provided', async () => {
    mockCreateProduct.mockResolvedValue({
      id: 'prod1',
      name: 'Shoes',
      variants: [{ id: 'v1', name: 'Default', sku_variant_code: 'DEFAULT' }],
    })

    const { result } = renderHook(() =>
      useQuickCreateProduct({ onClose: vi.fn(), onCreated: vi.fn(), supplierId: 'sup1' }),
    )

    act(() => {
      result.current.setProductName('Shoes')
      result.current.setCategoryId('cat1')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ supplier_id: 'sup1' }),
    )
  })
})
