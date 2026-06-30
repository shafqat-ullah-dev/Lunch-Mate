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
import { ChevronDown, ChevronRight, Check, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type EntryDetail = {
  id: string
  date: string
  totalExpense: number
  userDetails: {
    userId: string
    userName: string
    isPresent: boolean
    share: number | null
    paid: number | null
  }[]
}

type UserStat = {
  userId: string
  userName: string
  paid: number | null
  shares: number | null
  balance: number | null
}

type WeekData = {
  weekStart: string
  totalExpense: number
  userStats: UserStat[]
  entries: EntryDetail[]
}

type OverallBalance = {
  userId: string
  userName: string
  balance: number | null
}

function PrivateValue() {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-muted-foreground/40">
      <Lock className="h-3 w-3" />
    </span>
  )
}

import { UserLabel } from "./user-label"
import type { LunchUser } from "@/lib/actions"

interface WeeklySummaryProps {
  weeks: WeekData[]
  users: LunchUser[]
  overallBalances: OverallBalance[]
  currency?: string
  currentUserId?: string
}

export function WeeklySummary({
  weeks,
  users,
  overallBalances,
  currency,
  currentUserId
}: WeeklySummaryProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

  const toggleWeek = (weekStart: string) => {
    const next = new Set(expandedWeeks)
    if (next.has(weekStart)) {
      next.delete(weekStart)
    } else {
      next.add(weekStart)
    }
    setExpandedWeeks(next)
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Overall Balances (Carry Over) */}
      <Card className="border-2 border-border/40 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-4 pt-8 px-6 md:px-10">
          <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            Portfolio Status
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">Carry Over</Badge>
          </CardTitle>
          <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Current cumulative balances for all team members</p>
        </CardHeader>
        <CardContent className="px-6 md:px-10 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {overallBalances.map((balance) => (
              <div
                key={balance.userId}
                className="flex items-center justify-between rounded-2xl border-2 border-border/40 bg-background/40 p-4 backdrop-blur-md shadow-none group hover:border-primary/30 transition-all"
              >
                <span className="font-black text-foreground/80 text-[10px] uppercase tracking-wider">{balance.userName || "User"}</span>
                {balance.balance === null ? (
                  <PrivateValue />
                ) : (
                  <span
                    className={cn(
                      "font-black tabular-nums text-sm",
                      balance.balance > 0
                        ? "text-emerald-500 border border-emerald-500/20 px-2 rounded-lg bg-emerald-500/5"
                        : balance.balance < 0
                          ? "text-red-500 border border-red-500/20 px-2 rounded-lg bg-red-500/5"
                          : "text-muted-foreground"
                    )}
                  >
                    {balance.balance >= 0 ? "+" : "-"}{currency}{Math.abs(balance.balance).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary Table */}
      <Card className="border-2 border-border/40 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-4 pt-8 px-6 md:px-10">
          <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Performance History</CardTitle>
          <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Weekly expense and balance breakdown</p>
        </CardHeader>
        <CardContent className="px-0 pb-10">
          <div className="relative group/scroll">
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/20 to-transparent pointer-events-none z-10 lg:hidden group-hover/scroll:opacity-0 transition-opacity" />
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
              <Table className="min-w-[1000px] lg:min-w-full">
                <TableHeader>
                  <TableRow className="bg-primary/10 hover:bg-primary/10 border-none h-14">
                    <TableHead className="font-bold text-primary w-14 px-6"></TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[11px] text-primary">Week Period</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[11px] text-primary">
                      Volume
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
                  {weeks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3 + users.length * 2}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    weeks.map((week) => (
                      <Fragment key={week.weekStart}>
                        <TableRow
                          className="hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/50 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          onClick={() => toggleWeek(week.weekStart)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={expandedWeeks.has(week.weekStart)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              toggleWeek(week.weekStart)
                            }
                          }}
                        >
                          <TableCell className="py-4">
                            {expandedWeeks.has(week.weekStart) ? (
                              <ChevronDown className="h-4 w-4 text-primary animate-in fade-in duration-300" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold py-4">
                            {formatDate(week.weekStart)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums font-bold py-4">
                            {currency}{week.totalExpense.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          {users.map((user) => {
                            const stat = week.userStats.find((s) => s.userId === user.id)
                            return (
                              <TableCell
                                key={`${week.weekStart}-${user.id}-paid`}
                                className="text-center tabular-nums py-4"
                              >
                                {stat?.paid === null ? (
                                  <PrivateValue />
                                ) : (
                                  `${currency}${(stat?.paid || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                )}
                              </TableCell>
                            )
                          })}
                          {users.map((user) => {
                            const stat = week.userStats.find((s) => s.userId === user.id)
                            const balance = stat?.balance || 0
                            return (
                              <TableCell
                                key={`${week.weekStart}-${user.id}-bal`}
                                className={cn(
                                  "text-center tabular-nums font-bold py-4",
                                  stat?.balance !== null && (balance > 0
                                    ? "text-emerald-500"
                                    : balance < 0
                                      ? "text-red-500"
                                      : "text-muted-foreground")
                                )}
                              >
                                {stat?.balance === null ? (
                                  <PrivateValue />
                                ) : (
                                  `${balance >= 0 ? "+" : "-"}${currency}${Math.abs(balance).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                        {expandedWeeks.has(week.weekStart) && (
                          <TableRow className="bg-muted/10 border-none">
                            <TableCell colSpan={3 + users.length * 2} className="p-0">
                              <div className="p-4 lg:p-6 bg-muted/5 animate-in slide-in-from-top-2 duration-300">
                                <h4 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-primary" />
                                  Day-wise Breakdown
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
                                      {week.entries.map(entry => (
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
                    )))
                  }
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
