import { Bell } from 'lucide-react'
import { Button } from '../ui/button'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium">
          A
        </div>
      </div>
    </header>
  )
}
