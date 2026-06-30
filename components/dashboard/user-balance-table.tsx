"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserBalance } from "@/lib/actions"

import { UserLabel } from "./user-label"

interface UserBalanceTableProps {
  balances: UserBalance[]
  currency?: string
  currentUserId?: string
}

export function UserBalanceTable({ balances, currency, currentUserId }: UserBalanceTableProps) {
  return (
    <Card className="border-2 border-border/40 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
      <CardHeader className="pb-4 pt-8 px-6 md:px-10">
        <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Financial Status</CardTitle>
        <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Real-time team debt and credit tracking</p>
      </CardHeader>
      <CardContent className="px-0 pb-10">
        {balances.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-16 px-6">
            <div className="p-3 rounded-full bg-primary/5">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">No members yet</p>
            <p className="text-xs text-muted-foreground/60">Balances will show up here once entries are added.</p>
          </div>
        ) : (
        <div className="relative group/scroll">
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/20 to-transparent pointer-events-none z-10 lg:hidden group-hover/scroll:opacity-0 transition-opacity" />
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            <Table className="min-w-[600px] lg:min-w-full">
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5 border-none h-14">
                  <TableHead className="py-4 px-10 text-left font-black text-primary uppercase text-[10px] tracking-widest border-r border-primary/5">User Profile</TableHead>
                  <TableHead className="py-4 px-6 text-center font-black text-primary uppercase text-[10px] tracking-widest">Total Paid</TableHead>
                  <TableHead className="py-4 px-6 text-center font-black text-primary uppercase text-[10px] tracking-widest">Total Share</TableHead>
                  <TableHead className="py-4 px-6 text-center font-black text-primary uppercase text-[10px] tracking-widest">Active Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => (
                  <TableRow key={balance.id} className="hover:bg-muted/40 transition-colors border-b border-border/30 last:border-none group">
                    <TableCell className="py-6 px-10 text-left font-bold text-sm tracking-tight border-r border-primary/5">
                      <div className="flex justify-start transition-transform group-hover:translate-x-1 duration-300">
                        <UserLabel 
                          name={balance.name} 
                          isMe={balance.linked_user_id === currentUserId} 
                          className="text-xs md:text-sm"
                          marquee={false}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-6 text-center tabular-nums text-xs md:text-sm font-medium">
                      {currency} {(balance.totalPaid ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-6 px-6 text-center tabular-nums text-xs md:text-sm font-medium">
                      {currency} {(balance.totalShares ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-6 px-6 text-center tabular-nums text-xs md:text-sm font-black transition-all",
                        (balance.balance ?? 0) > 0
                          ? "text-emerald-500 bg-emerald-500/5 group-hover:bg-emerald-500/10"
                          : (balance.balance ?? 0) < 0
                          ? "text-red-500 bg-red-500/5 group-hover:bg-red-500/10"
                          : "text-muted-foreground"
                      )}
                    >
                      <div className="inline-flex items-center gap-1">
                        {(balance.balance ?? 0) >= 0 ? "+" : "-"}{currency} {Math.abs(balance.balance ?? 0).toLocaleString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        )}
      </CardContent>
    </Card>

  )
}
