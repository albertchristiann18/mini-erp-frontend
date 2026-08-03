import React from 'react'
import { cn } from '../../../lib/utils'

export function Cell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2 text-sm align-middle', className)}>{children}</td>
}

export function HeaderCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-3 py-2 text-sm font-medium text-left text-muted-foreground whitespace-nowrap', className)}>
      {children}
    </th>
  )
}
