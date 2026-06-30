"use client"

import { useState, Fragment } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/date-utils"
import { ChevronDown, ChevronRight, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type EntryDetail = {
  id: string
  date: string
  totalExpense: number
  userDetails: {
    userId: string
    userName: string
    isPresent: boolean
    share: number
    paid: number
  }[]
}

type UserStat = {
  userId: string
  userName: string
  paid: number
  shares: number
  balance: number
}

type MonthData = {
  monthKey: string
  totalExpense: number
  userStats: UserStat[]
  entries: EntryDetail[]
}

import { UserLabel } from "./user-label"
import type { LunchUser } from "@/lib/actions"

interface MonthlySummaryProps {
  months: MonthData[]
  users: LunchUser[]
  currency?: string
  currentUserId?: string
}

export function MonthlySummary({ 
  months, 
  users, 
  currency,
  currentUserId
}: MonthlySummaryProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  const toggleMonth = (monthKey: string) => {
    const next = new Set(expandedMonths)
    if (next.has(monthKey)) {
      next.delete(monthKey)
    } else {
      next.add(monthKey)
    }
    setExpandedMonths(next)
  }

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <Card className="border-2 border-border/50 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
      <CardHeader className="pb-4 pt-8 px-6 md:px-10">
        <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
          Monthly Ledger
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">Summary</Badge>
        </CardTitle>
        <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">High-level monthly aggregation of all lunch activities</p>
      </CardHeader>
      <CardContent className="px-0 pb-10">
        <div className="relative group/scroll">
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/20 to-transparent pointer-events-none z-10 lg:hidden group-hover/scroll:opacity-0 transition-opacity" />
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            <Table className="min-w-[1000px] lg:min-w-full">
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10 border-none h-14">
                  <TableHead className="font-bold text-primary w-14 px-6"></TableHead>
                  <TableHead className="text-center font-black uppercase tracking-widest text-[11px] text-primary min-w-[150px]">Month</TableHead>
                  <TableHead className="text-center font-black uppercase tracking-widest text-[11px] text-primary min-w-[120px]">
                    Total Expense
                  </TableHead>
                {users.map((user) => (
                  <TableHead
                    key={`${user.id}-paid`}
                    className="text-center font-bold text-primary min-w-[100px] max-w-[120px]"
                  >
                    <UserLabel 
                      name={user.name} 
                      isMe={user.linked_user_id === currentUserId} 
                      suffix="Paid"
                      className="text-[10px] text-center" 
                    />
                  </TableHead>
                ))}
                {users.map((user) => (
                  <TableHead
                    key={`${user.id}-bal`}
                    className="text-center font-bold text-primary min-w-[100px] max-w-[120px]"
                  >
                    <UserLabel 
                      name={user.name} 
                      isMe={user.linked_user_id === currentUserId} 
                      suffix="Bal"
                      className="text-[10px] text-center" 
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3 + users.length * 2}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                months.map((month) => (
                  <Fragment key={month.monthKey}>
                    <TableRow
                      key={month.monthKey}
                      className="hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      onClick={() => toggleMonth(month.monthKey)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expandedMonths.has(month.monthKey)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          toggleMonth(month.monthKey)
                        }
                      }}
                    >
                      <TableCell className="py-4">
                        {expandedMonths.has(month.monthKey) ? (
                          <ChevronDown className="h-4 w-4 text-primary animate-in fade-in duration-300" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold py-4">
                        {formatMonthLabel(month.monthKey)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-bold py-4">
                        {currency}{month.totalExpense.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      {users.map((user) => {
                        const stat = month.userStats.find((s) => s.userId === user.id)
                        return (
                          <TableCell
                            key={`${month.monthKey}-${user.id}-paid`}
                            className="text-center tabular-nums py-4"
                          >
                            {currency}{(stat?.paid || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        )
                      })}
                      {users.map((user) => {
                        const stat = month.userStats.find((s) => s.userId === user.id)
                        const balance = stat?.balance || 0
                        return (
                          <TableCell
                            key={`${month.monthKey}-${user.id}-bal`}
                            className={cn(
                              "text-center tabular-nums font-bold py-4",
                              balance > 0
                                ? "text-emerald-500"
                                : balance < 0
                                ? "text-red-500"
                                : "text-muted-foreground"
                            )}
                          >
                            {balance >= 0 ? "+" : "-"}{currency}{Math.abs(balance).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                    {expandedMonths.has(month.monthKey) && (
                      <TableRow className="bg-muted/10 border-none">
                        <TableCell colSpan={3 + users.length * 2} className="p-0">
                          <div className="p-4 lg:p-6 bg-muted/5 animate-in slide-in-from-top-2 duration-300">
                            <h4 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                              <div className="h-1 w-1 rounded-full bg-primary" />
                              Detailed Daily Records
                            </h4>
                            <div className="rounded-2xl border-2 border-border/50 overflow-hidden shadow-none">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-background/50 hover:bg-background/50 border-none">
                                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                                    {users.map(u => (
                                      <TableHead key={u.id} className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-[100px] max-w-[120px]">
                                        <UserLabel 
                                          name={u.name} 
                                          isMe={u.linked_user_id === currentUserId} 
                                          className="text-[10px]" 
                                        />
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {month.entries.map(entry => (
                                    <TableRow key={entry.id} className="hover:bg-primary/5 border-b border-border/20 last:border-none">
                                      <TableCell className="py-3 px-4 text-center text-sm font-medium">{formatDate(entry.date)}</TableCell>
                                      <TableCell className="py-3 px-4 text-center tabular-nums text-sm font-bold">{currency}{entry.totalExpense.toLocaleString()}</TableCell>
                                      {users.map(user => {
                                        const detail = entry.userDetails.find(d => d.userId === user.id)
                                        return (
                                          <TableCell key={user.id} className="py-3 px-4 text-center">
                                            {detail?.isPresent ? (
                                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-tight">
                                                <Check className="h-2.5 w-2.5" />
                                                Present
                                              </div>
                                            ) : (
                                              <span className="text-muted-foreground/30 text-[10px] font-bold">-</span>
                                            )}
                                          </TableCell>
                                        )
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
