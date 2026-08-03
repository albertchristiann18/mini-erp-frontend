export interface MarketplaceIntegrationProps {
  marketplaceIds: string[]
}

export function MarketplaceIntegration({ marketplaceIds }: MarketplaceIntegrationProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b font-semibold">Marketplace Integration</div>
      <div className="p-4">
        {marketplaceIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No marketplace listings</p>
        ) : (
          <div className="space-y-2">
            {marketplaceIds.map(mid => (
              <div key={mid} className="flex justify-between text-sm">
                <span className="font-mono text-xs text-muted-foreground">{mid}</span>
                <span className="text-green-600">Connected ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
