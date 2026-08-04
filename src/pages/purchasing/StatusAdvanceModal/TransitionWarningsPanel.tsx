/**
 * Non-blocking warning banner shown inside StatusAdvanceModal. Each group
 * pairs a message with an optional item list (e.g. qty received vs. ordered).
 * Used both for server-computed transition warnings and, for the COMPLETED
 * target, the live in-modal received_qty discrepancy recompute.
 */
interface WarningItem {
  name: string
  ordered_qty: number
  received_qty: number
}

interface WarningGroup {
  message: string
  items?: WarningItem[]
}

interface TransitionWarningsPanelProps {
  groups: WarningGroup[]
}

export function TransitionWarningsPanel({ groups }: TransitionWarningsPanelProps) {
  if (groups.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠ Warning</p>
      {groups.map((g, i) => (
        <div key={i}>
          <p className="text-sm text-amber-700 dark:text-amber-400">{g.message}</p>
          {g.items && g.items.length > 0 && (
            <ul className="mt-2 space-y-1">
              {g.items.map(item => (
                <li key={item.name} className="text-xs text-amber-600 dark:text-amber-500">
                  {item.name}: received {item.received_qty} of {item.ordered_qty}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">You can still confirm — this is a warning only.</p>
    </div>
  )
}
