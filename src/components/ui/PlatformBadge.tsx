interface Props {
  platform: 'SHOPEE' | 'TIKTOK' | 'MANUAL'
}

const config = {
  SHOPEE: { label: 'Shopee', className: 'bg-orange-500 text-white' },
  TIKTOK: { label: 'TikTok', className: 'bg-black text-white' },
  MANUAL: { label: 'Manual', className: 'bg-gray-400 text-white' },
}

export function PlatformBadge({ platform }: Props) {
  const c = config[platform] ?? config.MANUAL
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  )
}