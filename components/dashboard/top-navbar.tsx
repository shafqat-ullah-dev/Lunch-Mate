"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Menu, PanelLeftOpen } from "lucide-react"
import { useSidebar } from "@/hooks/use-sidebar"
import { cn } from "@/lib/utils"
import { PushNotificationToggle } from "@/components/dashboard/push-notification-toggle"

interface TopNavbarProps {
  title: string
  onMonthChange?: (month: string) => void
  onExport?: () => void
}

export function TopNavbar({
  title,
  onMonthChange,
  onExport,
}: TopNavbarProps) {
  const { toggle } = useSidebar()
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const currentMonth = new Date().toLocaleString("default", { month: "long" })

  return (
    <header suppressHydrationWarning className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/50 bg-background/60 backdrop-blur-xl px-4 md:px-6 lg:px-10">
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden hover:bg-primary/10 hover:text-primary transition-all rounded-xl shrink-0"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 truncate">
          <div className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <PanelLeftOpen className="h-4 w-4" />
          </div>
          <h2 className="text-sm md:text-lg font-black tracking-tight text-foreground/90 uppercase truncate">{title}</h2>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <PushNotificationToggle />
        {onMonthChange && (
          <Select defaultValue={currentMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-24 md:w-36 h-9 md:h-10 text-[10px] md:text-sm font-bold bg-background/50 border-border/50 backdrop-blur-sm shadow-sm hover:border-primary/50 transition-colors rounded-xl">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur-md border-border/50 rounded-xl">
              {months.map((month) => (
                <SelectItem key={month} value={month} className="text-xs md:text-sm font-medium">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {onExport && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExport} 
            className="h-9 md:h-10 border-border/50 hover:bg-primary hover:text-primary-foreground bg-background/50 shadow-sm transition-all hover:scale-105 rounded-xl px-2 md:px-4"
          >
            <Download className="md:mr-2 h-4 w-4" />
            <span className="hidden md:inline font-black uppercase tracking-widest text-[10px]">Export CSV</span>
          </Button>
        )}
      </div>
    </header>
  )
}
