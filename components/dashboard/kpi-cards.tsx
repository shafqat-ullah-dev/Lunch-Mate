"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingDown, TrendingUp, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardsProps {
  totalExpense: number
  totalPaid: number
  netBalance: number
  totalEntries: number
  currency?: string
}

export function KPICards({
  totalExpense,
  totalPaid,
  netBalance,
  totalEntries,
  currency,
}: KPICardsProps) {
  const cards = [
    {
      title: "Total Expense",
      value: `${currency}${totalExpense.toLocaleString()}`,
      icon: Receipt,
      trend: null,
    },
    {
      title: "Total Paid",
      value: `${currency}${totalPaid.toLocaleString()}`,
      icon: DollarSign,
      trend: null,
    },
    {
      title: "Net Balance",
      value: `${currency}${Math.abs(netBalance).toLocaleString()}`,
      icon: netBalance >= 0 ? TrendingUp : TrendingDown,
      trend: netBalance >= 0 ? "positive" : "negative",
    },
    {
      title: "Total Entries",
      value: totalEntries.toString(),
      icon: Receipt,
      trend: null,
    },
  ]

  if (totalEntries === 0) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="relative overflow-hidden border-border/40 border-dashed shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-black text-foreground/90 uppercase tracking-[0.2em]">
                  {card.title}
                </CardTitle>
                <div className="p-2 rounded-xl bg-white/[0.03] border-2 border-border/40 text-muted-foreground/50">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="text-3xl font-bold tracking-tight text-muted-foreground/30">—</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-2">
                  No Entries Yet
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div suppressHydrationWarning className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="relative group overflow-hidden border-border/40 hover:border-primary/50 shadow-none">
              {/* Corner Glow */}
              <div className={cn(
                "absolute -top-12 -right-12 w-24 h-24 blur-3xl rounded-full transition-opacity group-hover:opacity-100 opacity-50",
                card.trend === "positive" ? "bg-emerald-500/20" : 
                card.trend === "negative" ? "bg-red-500/10" : "bg-primary/10"
              )} />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-[10px] font-black text-foreground/90 uppercase tracking-[0.2em]">
                  {card.title}
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-xl bg-white/[0.03] border-2",
                  card.trend === "positive" ? "text-emerald-500 border-emerald-500/20" : 
                  card.trend === "negative" ? "text-red-500 border-red-500/20" : "text-primary border-primary/20"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pb-8">
                <div
                  className={cn(
                    "text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent",
                    card.trend === "positive" && "from-emerald-400 to-emerald-600",
                    card.trend === "negative" && "from-red-400 to-red-600"
                  )}
                >
                  {card.value}
                </div>
                {card.trend && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full animate-pulse",
                      card.trend === "positive" ? "bg-emerald-500 border border-emerald-500/30" : "bg-red-500 border border-red-500/30"
                    )} />
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      card.trend === "positive" ? "text-emerald-500" : "text-red-500"
                    )}>
                      {card.trend === "positive" ? "Healthy Credit" : "Needs Payment"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
