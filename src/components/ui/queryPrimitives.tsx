import { Loader2, AlertCircle, InboxIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/utils'
import type { ApiError } from '../../lib/errors'

// ─────────────────────────────────────────────────────────────────────────────
// Loading
// ─────────────────────────────────────────────────────────────────────────────

interface LoadingProps {
  className?: string
}

export function Loading({ className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('flex items-center justify-center py-12 text-muted-foreground', className)}
    >
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorState
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  error: ApiError
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 py-12 text-center text-destructive',
        className,
      )}
    >
      <AlertCircle className="h-8 w-8" />
      <p className="text-sm font-medium">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyProps {
  message?: string
  className?: string
}

export function Empty({ message = 'No data found.', className }: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 py-12 text-center text-muted-foreground',
        className,
      )}
    >
      <InboxIcon className="h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QueryState — wraps a TanStack Query result and branches to loading/error/empty/children
// ─────────────────────────────────────────────────────────────────────────────

interface QueryLike<TData> {
  isLoading: boolean
  isError: boolean
  error: unknown
  data: TData | undefined
  refetch: () => void
}

interface QueryStateProps<TData> {
  query: QueryLike<TData>
  /** Render children with the resolved (non-undefined) data */
  children: (data: TData) => React.ReactNode
  /** Custom empty message */
  emptyMessage?: string
  className?: string
}

export function QueryState<TData>({
  query,
  children,
  emptyMessage,
  className,
}: QueryStateProps<TData>) {
  if (query.isLoading) {
    return <Loading className={className} />
  }

  if (query.isError) {
    const apiError = query.error as ApiError
    return <ErrorState error={apiError} onRetry={query.refetch} className={className} />
  }

  if (query.data === undefined) {
    return <Empty message={emptyMessage} className={className} />
  }

  return <>{children(query.data)}</>
}
