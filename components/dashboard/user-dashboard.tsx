"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { LunchUser, UserBalance, EntryWithDetails } from "@/lib/actions"
import { formatDate } from "@/lib/date-utils"
import { WeeklySummary } from "./weekly-summary"
import { MonthlySummary } from "./monthly-summary"
import { LayoutDashboard, CalendarDays, CalendarRange, Lock } from "lucide-react"
import { UserLabel } from "./user-label"

interface UserDashboardProps {
  users: LunchUser[]
  balances: UserBalance[]
  entries: EntryWithDetails[]
  weeklyData: any
  monthlyData: any
  selectedUserId: string
  onUserChange: (userId: string) => void
  currency?: string
  currentUserId?: string
  isAdmin?: boolean
}

function PrivateAmount() {
  return (
    <div className="text-2xl md:text-3xl font-black tabular-nums text-muted-foreground/30 flex items-center gap-2">
      <Lock className="h-5 w-5" />
    </div>
  )
}

export function UserDashboard({
  users,
  balances,
  entries,
  weeklyData,
  monthlyData,
  selectedUserId,
  onUserChange,
  currency,
  currentUserId,
  isAdmin = false,
}: UserDashboardProps) {
  const selectedBalance = balances.find((b) => b.id === selectedUserId)
  
  // Get recent activity for selected user
  const recentActivity = entries
    .slice(0, 5)
    .map((entry) => {
      const share = entry.shares.find((s) => s.user_id === selectedUserId)
      const payment = entry.payments.find((p) => p.user_id === selectedUserId)
      return {
        date: entry.date,
        totalExpense: entry.total_expense,
        share: share?.share_amount || 0,
        paid: payment?.paid_amount || 0,
        notes: entry.notes,
      }
    })

  return (
    <div suppressHydrationWarning className="space-y-6 md:space-y-8">
      <Tabs defaultValue="overview" className="space-y-6 md:space-y-8">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto bg-card/50 backdrop-blur-md border-2 border-border/50 p-1.5 h-12 md:h-14 rounded-2xl shadow-none min-w-full md:min-w-0">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 md:gap-3 px-4 md:px-6 transition-all text-xs md:text-sm font-black uppercase tracking-wider">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 md:gap-3 px-4 md:px-6 transition-all text-xs md:text-sm font-black uppercase tracking-wider">
              <CalendarDays className="h-4 w-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 md:gap-3 px-4 md:px-6 transition-all text-xs md:text-sm font-black uppercase tracking-wider">
              <CalendarRange className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
          {/* User Selector */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
            <CardHeader className="py-4 md:py-6">
              <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {isAdmin ? "Select User Profile" : "Your Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6 md:pb-8">
              <Select value={selectedUserId} onValueChange={onUserChange} disabled={!isAdmin}>
                <SelectTrigger className="w-full md:max-w-xs bg-background/50 border-border/40 rounded-xl h-12 md:h-10">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 backdrop-blur-xl">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="rounded-lg">
                      <UserLabel
                        name={user.name}
                        isMe={user.linked_user_id === currentUserId}
                        className="text-xs md:text-sm"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* My Balance */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden relative group">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20" />
              <CardHeader className="pb-2 md:pb-3 pt-4 md:pt-6 px-4 md:px-6">
                <CardTitle className="text-[10px] md:text-sm font-black text-muted-foreground uppercase tracking-widest">
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
                {selectedBalance && selectedBalance.balance === null ? (
                  <PrivateAmount />
                ) : (
                  <div
                    className={cn(
                      "text-2xl md:text-3xl font-black tabular-nums",
                      (selectedBalance?.balance || 0) > 0
                        ? "text-emerald-500"
                        : (selectedBalance?.balance || 0) < 0
                        ? "text-red-500"
                        : "text-card-foreground"
                    )}
                  >
                    {(selectedBalance?.balance || 0) >= 0 ? "+" : ""}{currency} {(selectedBalance?.balance || 0).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 md:pb-3 pt-4 md:pt-6 px-4 md:px-6">
                <CardTitle className="text-[10px] md:text-sm font-black text-muted-foreground uppercase tracking-widest">
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
                {selectedBalance && selectedBalance.totalPaid === null ? (
                  <PrivateAmount />
                ) : (
                  <div className="text-2xl md:text-3xl font-black tabular-nums text-card-foreground">
                    {currency} {(selectedBalance?.totalPaid || 0).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 md:pb-3 pt-4 md:pt-6 px-4 md:px-6">
                <CardTitle className="text-[10px] md:text-sm font-black text-muted-foreground uppercase tracking-widest">
                  Total Shares
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
                {selectedBalance && selectedBalance.totalShares === null ? (
                  <PrivateAmount />
                ) : (
                  <div className="text-2xl md:text-3xl font-black tabular-nums text-card-foreground">
                    {currency} {(selectedBalance?.totalShares || 0).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 md:pb-3 pt-4 md:pt-6 px-4 md:px-6">
                <CardTitle className="text-[10px] md:text-sm font-black text-muted-foreground uppercase tracking-widest">
                  Days Present
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
                <div className="text-2xl md:text-3xl font-black tabular-nums text-card-foreground">
                  {selectedBalance?.daysPresent || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-2 border-border/50 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-6 md:px-10">
              <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Recent Activity</CardTitle>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">Your latest transactions and lunch participation</p>
            </CardHeader>
            <CardContent className="px-0 pb-10">
              <div className="relative group/scroll">
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/20 to-transparent pointer-events-none z-10 lg:hidden group-hover/scroll:opacity-0 transition-opacity" />
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                  <Table className="min-w-[600px] lg:min-w-full">
                    <TableHeader>
                      <TableRow className="bg-primary/5 hover:bg-primary/5 border-none h-14">
                        <TableHead className="py-4 px-6 font-bold text-primary text-[10px] uppercase tracking-widest">Date</TableHead>
                        <TableHead className="py-4 px-6 text-left font-bold text-primary text-[10px] uppercase tracking-widest">What We Ate</TableHead>
                        <TableHead className="py-4 px-6 text-right font-bold text-primary text-[10px] uppercase tracking-widest">Total Expense</TableHead>
                        <TableHead className="py-4 px-6 text-right font-bold text-primary text-[10px] uppercase tracking-widest">Your Share</TableHead>
                        <TableHead className="py-4 px-6 text-right font-bold text-primary text-[10px] uppercase tracking-widest">You Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((activity, index) => (
                        <TableRow key={index} className="hover:bg-muted/40 transition-colors border-b border-border/30 last:border-none group">
                          <TableCell className="py-5 px-6 font-black text-xs md:text-sm">
                            {formatDate(activity.date)}
                          </TableCell>
                          <TableCell className="py-5 px-6 text-left text-xs md:text-sm font-medium text-muted-foreground max-w-[200px]">
                            {activity.notes ? (
                              <span className="block truncate" title={activity.notes}>
                                {activity.notes}
                              </span>
                            ) : (
                              <span className="italic opacity-40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-5 px-6 text-right tabular-nums text-xs md:text-sm font-medium">
                            {currency} {activity.totalExpense.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-5 px-6 text-right tabular-nums text-xs md:text-sm font-medium">
                            {currency} {activity.share.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-5 px-6 text-right tabular-nums text-xs md:text-sm font-black transition-all",
                              activity.paid > 0 ? "text-emerald-500 bg-emerald-500/5 group-hover:bg-emerald-500/10" : "text-muted-foreground/30"
                            )}
                          >
                            {currency} {activity.paid.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentActivity.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-16"
                          >
                            <div className="flex flex-col items-center gap-2 opacity-40">
                              <LayoutDashboard className="h-8 w-8 mb-2" />
                              <p className="text-xs font-black uppercase tracking-widest">No activity found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
          <WeeklySummary 
            weeks={weeklyData.weeks} 
            users={weeklyData.users} 
            overallBalances={weeklyData.overallBalances} 
            currency={currency}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="monthly" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
          <MonthlySummary 
            months={monthlyData.months} 
            users={monthlyData.users} 
            currency={currency}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
