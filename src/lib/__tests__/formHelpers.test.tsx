import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { applyApiErrors, useResetOnOpen } from '../formHelpers'
import type { ApiError } from '../errors'

// ─────────────────────────────────────────────────────────────────────────────
// applyApiErrors
// ─────────────────────────────────────────────────────────────────────────────

describe('applyApiErrors', () => {
  it('calls setError for each field in fieldErrors', () => {
    const setError = vi.fn()
    const form = { setError } as unknown as Parameters<typeof applyApiErrors>[0]

    const error: ApiError = {
      status: 422,
      message: 'Validation failed.',
      fieldErrors: {
        email: 'Invalid email address.',
        password: 'Too short.',
      },
    }

    applyApiErrors(form, error)

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Invalid email address.',
    })
    expect(setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'Too short.',
    })
    expect(setError).toHaveBeenCalledTimes(2)
  })

  it('does not call setError when fieldErrors is absent', () => {
    const setError = vi.fn()
    const form = { setError } as unknown as Parameters<typeof applyApiErrors>[0]

    const error: ApiError = { status: 500, message: 'Server error.' }

    applyApiErrors(form, error)

    expect(setError).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useResetOnOpen
// ─────────────────────────────────────────────────────────────────────────────

interface FormValues {
  name: string
  email: string
}

function TestComponent({
  open,
  values,
}: {
  open: boolean
  values: FormValues
}) {
  const form = useForm<FormValues>({ defaultValues: { name: '', email: '' } })
  useResetOnOpen(form, open, values)

  return (
    <div>
      <span data-testid="name">{form.watch('name')}</span>
      <span data-testid="email">{form.watch('email')}</span>
    </div>
  )
}

describe('useResetOnOpen', () => {
  it('resets form with provided values when open transitions to true', () => {
    const { rerender } = render(
      <TestComponent open={false} values={{ name: '', email: '' }} />,
    )

    // Transition open → true with new values
    rerender(
      <TestComponent open={true} values={{ name: 'Alice', email: 'alice@example.com' }} />,
    )

    expect(screen.getByTestId('name').textContent).toBe('Alice')
    expect(screen.getByTestId('email').textContent).toBe('alice@example.com')
  })

  it('does not reset when open is false', () => {
    render(<TestComponent open={false} values={{ name: 'Bob', email: 'bob@example.com' }} />)

    // Name should remain empty because open is false
    expect(screen.getByTestId('name').textContent).toBe('')
  })

  it('re-resets when open is toggled closed then open again with new values', async () => {
    const { rerender } = render(
      <TestComponent open={true} values={{ name: 'Alice', email: 'alice@example.com' }} />,
    )

    expect(screen.getByTestId('name').textContent).toBe('Alice')

    // Close and reopen with different values
    rerender(<TestComponent open={false} values={{ name: '', email: '' }} />)

    await act(async () => {
      rerender(<TestComponent open={true} values={{ name: 'Bob', email: 'bob@example.com' }} />)
    })

    expect(screen.getByTestId('name').textContent).toBe('Bob')
    expect(screen.getByTestId('email').textContent).toBe('bob@example.com')
  })
})
