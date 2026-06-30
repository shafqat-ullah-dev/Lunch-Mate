"use client"

import { useState } from "react"
import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Receipt, Loader2, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { formatDate, getDayName, formatMonthYear } from "@/lib/date-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateEntry, settleUserDebt } from "@/lib/actions"
import { toast } from "sonner"

type UserDetail = {
  userId: string
  userName: string
  isPresent: boolean
  share: number
  paid: number
  balance: number
  totalBalance?: number
}

type EntryData = {
  id: string
  date: string
  totalExpense: number
  notes?: string | null
  userDetails: UserDetail[]
}

import { AddEntryDialog } from "./add-entry-dialog"
import { EditEntryDialog } from "./edit-entry-dialog"
import { UserLabel } from "./user-label"

function PaymentAmountEdit({ entryId, userId, initialValue, entryData, currency, isPresent, isAdmin, totalBalance = 0 }: {
  entryId: string,
  userId: string,
  initialValue: number,
  entryData: EntryData,
  currency: string,
  isPresent: boolean,
  isAdmin: boolean,
  totalBalance?: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue.toString())

  if (isEditing) {
    return (
      <div className="flex flex-col items-center justify-center p-1 gap-2 bg-background border border-primary rounded-lg shadow-xl animate-in zoom-in-95 duration-200 min-w-[120px]">
        <Input
          className="h-8 w-24 text-right font-black border-none text-xs focus-visible:ring-0"
          type="number"
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              const newValue = parseFloat(value)
              if (isNaN(newValue) || newValue < 0) return

              if (newValue === initialValue) {
                setIsEditing(false)
                return
              }

              const loader = toast.loading("Updating payment...")
              try {
                // Update specific payment in the list
                const otherPayments = entryData.userDetails
                  .filter(d => d.userId !== userId && d.paid > 0)
                  .map(d => ({ userId: d.userId, amount: d.paid }));

                const newPayments = [...otherPayments];
                if (newValue > 0) {
                  newPayments.push({ userId, amount: newValue });
                }

                const result = await updateEntry(entryId, {
                  date: entryData.date,
                  totalExpense: entryData.totalExpense,
                  notes: entryData.notes || undefined,
                  shares: entryData.userDetails.filter(d => d.isPresent).map(d => ({
                    userId: d.userId,
                    amount: d.share
                  })),
                  payments: newPayments
                });

                if (result.success) {
                  toast.success("Payment updated", { id: loader });
                  setIsEditing(false);
                } else {
                  toast.error(result.error || "Failed", { id: loader });
                }
              } catch (err) {
                toast.error("Error", { id: loader });
              }
            } else if (e.key === "Escape") {
              setValue(initialValue.toString());
              setIsEditing(false);
            }
          }}
          onBlur={(e) => {
            // Only close if we didn't click on the "Paid All" button
            if (!e.relatedTarget?.getAttribute('data-paid-all')) {
              setValue(initialValue.toString());
              setIsEditing(false);
            }
          }}
        />
        {totalBalance < 0 && (
          <Button
            size="sm"
            variant="secondary"
            data-paid-all="true"
            className="h-6 w-full text-[9px] font-black uppercase tracking-tighter bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground"
            onClick={async () => {
              const loader = toast.loading("Processing Full Settlement...");
              try {
                const result = await settleUserDebt(userId);

                if (result.success) {
                  toast.success("All historical debts settled!", { id: loader });
                  setIsEditing(false);
                } else {
                  toast.error(result.error || "Settlement failed", { id: loader });
                }
              } catch (err) {
                toast.error("An error occurred during settlement", { id: loader });
              }
            }}
          >
            Settle All Debt ({currency}{Math.abs(totalBalance).toLocaleString()})
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-center",
        !isAdmin || !isPresent ? "cursor-default pointer-events-none" : "cursor-pointer group",
        initialValue > 0 ? "bg-primary/10 text-primary font-black" : "text-muted-foreground/30 hover:bg-primary/5 hover:text-primary/60"
      )}
      onClick={() => isAdmin && isPresent && setIsEditing(true)}
    >
      <span className="tabular-nums">
        {currency}{initialValue.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      {isAdmin && isPresent && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </div>
  )
}

function TotalExpenseEdit({ id, initialValue, date, notes, currency, userDetails, currentUserId, isAdmin }: {
  id: string, initialValue: number, date: string, notes?: string | null, currency: string, userDetails: UserDetail[], currentUserId?: string, isAdmin: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue.toString())

  if (isEditing) {
    return (
      <div className="flex items-center justify-center p-2 gap-2">
        <Input
          className="h-10 w-24 text-right font-black bg-background border-primary focus-visible:ring-1"
          type="number"
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              const newTotal = parseFloat(value)
              if (isNaN(newTotal) || newTotal <= 0) return

              if (newTotal === initialValue) {
                setIsEditing(false)
                return
              }

              const loader = toast.loading("Updating total...")
              try {
                const presentIds = userDetails.filter(d => d.isPresent).map(d => d.userId)
                const newShare = newTotal / presentIds.length

                const result = await updateEntry(id, {
                  date,
                  totalExpense: newTotal,
                  notes: notes || undefined,
                  shares: presentIds.map(uid => ({ userId: uid, amount: newShare })),
                  payments: userDetails.filter(d => d.paid > 0).map(d => ({ userId: d.userId, amount: d.paid }))
                })

                if (result.success) {
                  toast.success("Total updated", { id: loader })
                  setIsEditing(false)
                } else {
                  toast.error(result.error || "Failed", { id: loader })
                }
              } catch (err) {
                toast.error("Error", { id: loader })
              }
            } else if (e.key === "Escape") {
              setValue(initialValue.toString())
              setIsEditing(false)
            }
          }}
          onBlur={() => {
            setValue(initialValue.toString())
            setIsEditing(false)
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "transition-colors px-4 py-6 text-center tabular-nums h-full flex flex-col justify-center",
        !isAdmin ? "cursor-default" : "cursor-pointer hover:bg-primary/5 group"
      )}
      onClick={() => isAdmin && setIsEditing(true)}
      title={isAdmin ? "Click to edit total" : undefined}
    >
      <div>
        <span className="text-xs font-normal text-muted-foreground mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {currency}
        </span>
        {initialValue.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  )
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number)
  const date = new Date(year, monthNum - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

interface DailyLunchTrackerProps {
  entries: EntryData[]
  users: { id: string; name: string; linked_user_id?: string | null; totalBalance?: number }[]
  currency?: string
  currentUserId?: string
  isAdmin?: boolean
  month?: string
}

export function DailyLunchTracker({ entries, users, currency, currentUserId, isAdmin = false, month }: DailyLunchTrackerProps) {
  return (
    <Card className="border-2 border-border/50 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
      <CardHeader className="pb-4 pt-8 px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              Daily Records
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                {entries.length} Entries
              </Badge>
            </CardTitle>
            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Manage daily lunch expenses and attendance</p>
          </div>
          <div className="flex items-center gap-3">
            {month && (
              <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-background/50 p-1">
                <Link href={`?month=${shiftMonth(month, -1)}`}>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="px-2 text-xs font-black uppercase tracking-widest min-w-[110px] text-center">
                  {formatMonthYear(`${month}-01`)}
                </span>
                <Link href={`?month=${shiftMonth(month, 1)}`}>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
            {isAdmin && <AddEntryDialog users={users} currency={currency} currentUserId={currentUserId} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-10">
        <div className="relative group/scroll">
          {/* Mobile Scroll Indicator */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/20 to-transparent pointer-events-none z-10 lg:hidden group-hover/scroll:opacity-0 transition-opacity" />
          
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            <Table className="min-w-[1200px] lg:min-w-full border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5 border-none h-10">
                  <TableHead className="sticky left-0 z-30 h-10 bg-card/95 backdrop-blur-md border-r-2 border-primary/20 shadow-none" />
                  <TableHead colSpan={4} className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground h-10 px-6">1. Metadata</TableHead>
                  <TableHead colSpan={users.length} className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 text-center border-l border-primary/10 h-10">2. Attendance</TableHead>
                  <TableHead className="w-0 p-0 border-r border-primary/10 h-10" />
                  <TableHead colSpan={users.length} className="text-[9px] font-black uppercase tracking-[0.2em] text-primary text-center border-l border-primary/10 h-10">3. Shares</TableHead>
                  <TableHead className="w-0 p-0 border-r border-primary/10 h-10" />
                  <TableHead colSpan={users.length} className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 text-center border-l border-primary/10 h-10">4. Payments</TableHead>
                  <TableHead className="w-0 p-0 border-r border-primary/10 h-10" />
                  <TableHead colSpan={users.length} className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 text-center border-l border-primary/10 h-10">5. Balances</TableHead>
                  <TableHead className="sticky right-0 z-30 h-10 bg-card/95 backdrop-blur-md border-l-2 border-primary/20 shadow-none" />
                </TableRow>
              <TableRow className="bg-primary/10 hover:bg-primary/10 h-14">
                <TableHead className="sticky left-0 z-20 font-bold text-primary px-4 whitespace-nowrap bg-primary/10 backdrop-blur-sm border-r-2 border-primary/20 shadow-none">Date</TableHead>
                <TableHead className="font-bold text-primary whitespace-nowrap">Day</TableHead>
                <TableHead className="text-center font-bold text-primary px-4 whitespace-nowrap">Total Expense</TableHead>
                <TableHead className="font-bold text-primary px-4 min-w-[140px] whitespace-nowrap">Paid By</TableHead>
                <TableHead className="font-bold text-primary border-r border-primary/5 px-4 min-w-[160px] whitespace-nowrap">What Ate</TableHead>
                {users.map((user) => (
                  <TableHead
                    key={`${user.id}-present`}
                    className="text-center font-semibold text-primary min-w-[100px] max-w-[120px]"
                  >
                    <UserLabel
                      name={user.name}
                      isMe={user.linked_user_id === currentUserId}
                      suffix="Atten"
                      className="text-[10px]"
                    />
                  </TableHead>
                ))}
                <TableHead className="w-0 p-0 border-r border-primary/20" />
                {users.map((user) => (
                  <TableHead
                    key={`${user.id}-share`}
                    className="text-center font-semibold text-primary min-w-[100px] max-w-[120px]"
                  >
                    <UserLabel
                      name={user.name}
                      isMe={user.linked_user_id === currentUserId}
                      suffix="Share"
                      className="text-[10px] text-center"
                    />
                  </TableHead>
                ))}
                <TableHead className="w-0 p-0 border-r border-primary/20" />
                {users.map((user) => (
                  <TableHead
                    key={`${user.id}-paid`}
                    className="text-center font-semibold text-primary min-w-[100px] max-w-[120px]"
                  >
                    <UserLabel
                      name={user.name}
                      isMe={user.linked_user_id === currentUserId}
                      suffix="Paid"
                      className="text-[10px] text-center"
                    />
                  </TableHead>
                ))}
                <TableHead className="w-0 p-0 border-r border-primary/20" />
                {users.map((user) => (
                  <TableHead
                    key={`${user.id}-bal`}
                    className="text-center font-semibold text-primary min-w-[100px] max-w-[120px]"
                  >
                    <UserLabel
                      name={user.name}
                      isMe={user.linked_user_id === currentUserId}
                      suffix="Bal"
                      className="text-[10px] text-center"
                    />
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 z-20 text-center font-semibold text-primary bg-background/95 backdrop-blur-sm border-l-2 border-primary/20 shadow-none">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9 + users.length * 4}
                    className="py-12 text-center text-muted-foreground bg-muted/5 rounded-2xl border-2 border-dashed border-border/50"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/5">
                        <Receipt className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-base">No entries found</p>
                        <p className="text-xs">Add your first lunch record using the button above.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="sticky left-0 z-10 font-bold whitespace-nowrap group-hover:text-primary transition-colors bg-card/95 backdrop-blur-md border-r-2 border-primary/20 shadow-none">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground font-medium uppercase text-[10px]">
                      {getDayName(entry.date)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums font-black text-lg px-4 py-6 border-l border-primary/5 p-0">
                      <TotalExpenseEdit
                        id={entry.id}
                        initialValue={entry.totalExpense}
                        date={entry.date}
                        notes={entry.notes}
                        currency={currency || "₹"}
                        userDetails={entry.userDetails}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                      />
                    </TableCell>
                    <TableCell className="text-center px-4 h-full">
                      <Select
                        disabled={!isAdmin}
                        defaultValue={entry.userDetails.find(d => d.paid > 0)?.userId || ""}
                        onValueChange={async (newPayerId) => {
                          const originalPayer = entry.userDetails.find(d => d.paid > 0);
                          if (originalPayer?.userId === newPayerId) return;

                          const loader = toast.loading("Updating payer...");
                          try {
                            const result = await updateEntry(entry.id, {
                              date: entry.date,
                              totalExpense: entry.totalExpense,
                              notes: entry.notes || undefined,
                              shares: entry.userDetails.filter(d => d.isPresent).map(d => ({
                                userId: d.userId,
                                amount: d.share
                              })),
                              payments: [{ userId: newPayerId, amount: entry.totalExpense }]
                            });

                            if (result.success) {
                              toast.success("Payer updated", { id: loader });
                            } else {
                              toast.error(result.error || "Update failed", { id: loader });
                            }
                          } catch (err) {
                            toast.error("An error occurred", { id: loader });
                          }
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-9 border-none rounded-lg px-2 focus:ring-0",
                          !isAdmin ? "bg-transparent cursor-default px-0" : "bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                        )}>
                          <SelectValue>
                            {(() => {
                              const originalPayer = entry.userDetails.find(d => d.paid > 0);
                              return originalPayer ? (
                                <UserLabel
                                  name={originalPayer.userName}
                                  isMe={originalPayer.userId === currentUserId}
                                  className="text-xs font-black truncate max-w-[80px]"
                                  marquee={false}
                                />
                              ) : (
                                <span className="text-muted-foreground font-bold italic text-xs">Select Payer</span>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 backdrop-blur-xl">
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id} className="rounded-lg">
                              <UserLabel
                                name={user.name}
                                isMe={user.linked_user_id === currentUserId}
                                marquee={false}
                                className="text-xs"
                              />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs border-r border-primary/5 px-4 max-w-[160px]">
                      {entry.notes ? (
                        <span className="block truncate" title={entry.notes}>
                          {entry.notes}
                        </span>
                      ) : (
                        <span className="italic opacity-40">—</span>
                      )}
                    </TableCell>
                    {users.map((user) => {
                      const detail = entry.userDetails.find((d) => d.userId === user.id)
                      return (
                        <TableCell
                          key={`${entry.id}-${user.id}-present`}
                          className="text-center p-0"
                        >
                          <div className="flex justify-center py-2 h-full cursor-pointer hover:bg-primary/5 hover:rounded transition-colors group">
                            <Checkbox
                              disabled={!isAdmin}
                              checked={detail?.isPresent}
                              onCheckedChange={async (checked) => {
                                const isPresent = checked === true;
                                if (detail?.isPresent === isPresent) return;

                                const loader = toast.loading("Updating attendance...");
                                try {
                                  // Determine new list of present users
                                  const otherPresentIds = entry.userDetails
                                    .filter(d => d.userId !== user.id && d.isPresent)
                                    .map(d => d.userId);

                                  const newPresentIds = isPresent
                                    ? [...otherPresentIds, user.id]
                                    : otherPresentIds;

                                  if (newPresentIds.length === 0) {
                                    toast.error("At least one person must be present", { id: loader });
                                    return;
                                  }

                                  const newTotal = entry.totalExpense;
                                  const newShare = newTotal / newPresentIds.length;

                                  const result = await updateEntry(entry.id, {
                                    date: entry.date,
                                    totalExpense: newTotal,
                                    notes: entry.notes || undefined,
                                    shares: newPresentIds.map(id => ({ userId: id, amount: newShare })),
                                    payments: entry.userDetails
                                      .filter(d => d.paid > 0)
                                      .map(d => ({ userId: d.userId, amount: d.paid }))
                                  });

                                  if (result.success) {
                                    toast.success("Attendance updated", { id: loader });
                                  } else {
                                    toast.error(result.error || "Update failed", { id: loader });
                                  }
                                } catch (err) {
                                  toast.error("An error occurred", { id: loader });
                                }
                              }}
                              className={cn(
                                "h-5 w-5 rounded-md border-primary/30",
                                !isAdmin && "opacity-50 cursor-default"
                              )}
                            />
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="w-0 p-0 border-r border-primary/10" />
                    {users.map((user) => {
                      const detail = entry.userDetails.find((d) => d.userId === user.id)
                      return (
                        <TableCell
                          key={`${entry.id}-${user.id}-share`}
                          className="text-center tabular-nums"
                        >
                          {currency}{(detail?.share || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      )
                    })}
                    <TableCell className="w-0 p-0 border-r border-primary/10" />
                    {users.map((user) => {
                      const detail = entry.userDetails.find((d) => d.userId === user.id)
                      return (
                        <TableCell
                          key={`${entry.id}-${user.id}-paid`}
                          className="text-center tabular-nums p-2"
                        >
                          <PaymentAmountEdit
                            entryId={entry.id}
                            userId={user.id}
                            initialValue={detail?.paid || 0}
                            entryData={entry}
                            currency={currency || "₹"}
                            isPresent={!!detail?.isPresent}
                            isAdmin={isAdmin}
                            totalBalance={detail?.totalBalance}
                          />
                        </TableCell>
                      )
                    })}
                    <TableCell className="w-0 p-0 border-r border-primary/10" />
                    {users.map((user) => {
                      const detail = entry.userDetails.find((d) => d.userId === user.id)
                      const balance = detail?.balance || 0
                      return (
                        <TableCell
                          key={`${entry.id}-${user.id}-bal`}
                          className={cn(
                            "text-center tabular-nums font-black text-sm transition-colors",
                            balance > 0
                              ? "text-emerald-500 bg-emerald-500/5"
                              : balance < 0
                                ? "text-red-500 bg-red-500/5"
                                : "text-muted-foreground"
                          )}
                        >
                          <span className="text-[10px] font-bold mr-0.5 text-muted-foreground">{currency}</span>
                          {Math.abs(balance).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      )
                    })}
                    <TableCell className="sticky right-0 z-10 text-center bg-card/95 backdrop-blur-md border-l-2 border-primary/20 shadow-none">
                      {isAdmin && <EditEntryDialog entry={entry} users={users} currency={currency} currentUserId={currentUserId} />}
                    </TableCell>
                  </TableRow>
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
