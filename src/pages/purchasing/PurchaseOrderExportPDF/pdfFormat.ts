export function fmtNum(val: string | number | null | undefined, decimals = 2): string {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(decimals)
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  const map: Record<string, string> = {
    CNY: '¥', RMB: '¥', USD: '$', EUR: '€', SGD: 'S$', IDR: 'Rp',
  }
  return map[(currency ?? '').toUpperCase()] ?? (currency ?? '¥')
}
