import { useEffect } from 'react'
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import type { ApiError } from './errors'

/**
 * Maps API field errors onto a React Hook Form instance.
 *
 * Call this in a mutation's onError handler as the standard way to surface
 * server-side validation errors onto the form.
 *
 * - fieldErrors → setError per field (type: 'server')
 * - If no fieldErrors, the caller is responsible for showing error.message
 *   (typically via toast — see lib/toast.ts)
 */
export function applyApiErrors<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, 'setError'>,
  error: ApiError,
): void {
  if (!error.fieldErrors) return

  for (const [field, message] of Object.entries(error.fieldErrors)) {
    form.setError(field as Path<TFieldValues>, {
      type: 'server',
      message,
    })
  }
}

/**
 * Resets a React Hook Form instance whenever a dialog/modal opens.
 *
 * Replaces the common duplicated pattern:
 *   useEffect(() => { if (open) { form.reset(values) } }, [open])
 * with a single named helper that also avoids the exhaustive-deps lint warning.
 *
 * Usage:
 *   useResetOnOpen(form, open, editItem ?? defaultValues)
 */
export function useResetOnOpen<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, 'reset'>,
  open: boolean,
  values: TFieldValues,
): void {
  useEffect(() => {
    if (open) {
      form.reset(values)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}
