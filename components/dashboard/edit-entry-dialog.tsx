"use client"

import { useState, useEffect } from "react"
import { Pencil, Users, Calculator, Receipt, Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { updateEntry, deleteEntry, settleUserDebt } from "@/lib/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { UserLabel } from "./user-label"

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

interface EditEntryDialogProps {
  entry: EntryData
  users: { id: string; name: string; linked_user_id?: string | null; totalBalance?: number }[]
  currency?: string
  currentUserId?: string
  trigger?: React.ReactNode
}

export function EditEntryDialog({ entry, users, currency, currentUserId, trigger }: EditEntryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form State
  const [date, setDate] = useState(entry.date)
  const [totalExpense, setTotalExpense] = useState(entry.totalExpense.toString())
  
  // Find who paid from entry details
  const initialPaidBy = entry.userDetails.find(d => d.paid > 0)?.userId || users[0]?.id || ""
  const [paidBy, setPaidBy] = useState(initialPaidBy)
  
  // Initial present users
  const [presentUserIds, setPresentUserIds] = useState<Set<string>>(
    new Set(entry.userDetails.filter(d => d.isPresent).map(d => d.userId))
  )
  const [extraPayment, setExtraPayment] = useState(0)
  const [notes, setNotes] = useState(entry.notes || "")
  const [customSplit, setCustomSplit] = useState(false)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [splitPayment, setSplitPayment] = useState(false)
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({})

  // Sync state when entry changes (if needed)
  useEffect(() => {
    if (open) {
      setDate(entry.date)
      setTotalExpense(entry.totalExpense.toString())
      const payers = entry.userDetails.filter(d => d.paid > 0)
      const currentPaidBy = payers[0]?.userId || users[0]?.id || ""
      setPaidBy(currentPaidBy)
      setPresentUserIds(new Set(entry.userDetails.filter(d => d.isPresent).map(d => d.userId)))
      setNotes(entry.notes || "")
      setCustomSplit(false)
      setCustomAmounts(
        Object.fromEntries(entry.userDetails.filter(d => d.isPresent).map(d => [d.userId, d.share.toString()]))
      )
      // Existing entries with more than one payer are already a split payment;
      // auto-enable the toggle and prefill so saving doesn't collapse them to one payer.
      if (payers.length > 1) {
        setSplitPayment(true)
        setPaymentAmounts(Object.fromEntries(payers.map(p => [p.userId, p.paid.toString()])))
      } else {
        setSplitPayment(false)
        setPaymentAmounts({})
      }
    }
  }, [open, entry, users])

  const total = parseFloat(totalExpense) || 0
  const presentCount = presentUserIds.size
  const sharePerPerson = presentCount > 0 ? total / presentCount : 0
  const customTotal = Array.from(presentUserIds).reduce(
    (sum, userId) => sum + (parseFloat(customAmounts[userId]) || 0),
    0
  )
  const paymentsTotal = users.reduce(
    (sum, user) => sum + (parseFloat(paymentAmounts[user.id]) || 0),
    0
  )

  const toggleUser = (userId: string) => {
    const next = new Set(presentUserIds)
    if (next.has(userId)) {
      next.delete(userId)
    } else {
      next.add(userId)
    }
    setPresentUserIds(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totalExpense || total <= 0) {
      toast.error("Please enter a valid total expense")
      return
    }
    if (presentCount === 0) {
      toast.error("At least one person must be present")
      return
    }
    if (customSplit && Math.abs(customTotal - total) > 0.01) {
      toast.error(`Custom split must add up to the total expense (currently ${customTotal.toFixed(2)})`)
      return
    }
    if (splitPayment && Math.abs(paymentsTotal - total) > 0.01) {
      toast.error(`Split payment must add up to the total expense (currently ${paymentsTotal.toFixed(2)})`)
      return
    }

    setIsSubmitting(true)
    try {
      const shares = Array.from(presentUserIds).map((userId) => ({
        userId,
        amount: customSplit ? parseFloat(customAmounts[userId]) || 0 : sharePerPerson,
      }))

      const payments = splitPayment
        ? users
            .map((user) => ({ userId: user.id, amount: parseFloat(paymentAmounts[user.id]) || 0 }))
            .filter((p) => p.amount > 0)
        : [{ userId: paidBy, amount: total }]

      const result = await updateEntry(entry.id, {
        date,
        totalExpense: total,
        notes,
        shares,
        payments,
      })

      if (result.success) {
        if (extraPayment > 0) {
          const settleResult = await settleUserDebt(paidBy, extraPayment)
          if (!settleResult.success) {
            toast.error(settleResult.error || "Entry updated, but extra payment toward debt failed")
          }
        }
        toast.success("Entry updated successfully")
        setOpen(false)
        setExtraPayment(0)
      } else {
        toast.error(result.error || "Failed to update entry")
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return
    
    setIsDeleting(true)
    try {
      const result = await deleteEntry(entry.id)
      if (result.success) {
        toast.success("Entry deleted successfully")
        setOpen(false)
      } else {
        toast.error(result.error || "Failed to delete entry")
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-card/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Receipt className="h-5 w-5 text-primary" />
            Edit Lunch Entry
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="edit-date" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Lunch Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-12 bg-background/50 border-border/40 rounded-xl px-4"
              />
            </div>
            
            <div className="grid gap-2.5">
              <Label htmlFor="edit-total" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 text-primary">Total Expense ({currency})</Label>
              <Input
                id="edit-total"
                type="number"
                placeholder="0.00"
                value={totalExpense}
                onChange={(e) => setTotalExpense(e.target.value)}
                required
                step="0.01"
                className="h-14 bg-background/50 border-2 border-primary/20 hover:border-primary/50 text-xl font-black rounded-xl px-4 shadow-none"
              />
            </div>

            <div className="grid gap-2.5">
              <div className="flex justify-between items-end">
                <Label htmlFor="edit-paidBy" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Who Paid?</Label>
                <div className="flex items-center gap-3">
                  {!splitPayment && (() => {
                    const selectedUser = users.find(u => u.id === paidBy);
                    const detail = entry.userDetails.find(d => d.userId === paidBy);
                    const balance = selectedUser?.totalBalance ?? detail?.totalBalance ?? 0;

                    if (balance < 0) {
                      return (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-[10px] font-black uppercase text-primary animate-pulse"
                          onClick={() => setExtraPayment(Math.abs(balance))}
                        >
                          Paid All (Add {currency}{Math.abs(balance).toLocaleString()})
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="edit-split-payment"
                      checked={splitPayment}
                      onCheckedChange={(checked) => {
                        setSplitPayment(checked)
                        setExtraPayment(0)
                      }}
                    />
                    <Label htmlFor="edit-split-payment" className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground cursor-pointer">
                      Split Payment
                    </Label>
                  </div>
                </div>
              </div>
              {splitPayment ? (
                <div className="space-y-2">
                  <div className="grid gap-2 p-4 rounded-2xl bg-background/20 border-2 border-border/30 max-h-[200px] overflow-y-auto shadow-none custom-scrollbar">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-3">
                        <UserLabel
                          name={user.name}
                          isMe={user.linked_user_id === currentUserId}
                          className="text-xs flex-1 min-w-0"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={paymentAmounts[user.id] ?? ""}
                          onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                          className="h-9 w-28 text-right text-xs font-black bg-background/50 border-primary/20 rounded-lg px-2"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entered / Total</span>
                    <span className={cn(
                      "text-xs font-black",
                      Math.abs(paymentsTotal - total) > 0.01 ? "text-red-500" : "text-emerald-500"
                    )}>
                      {currency}{paymentsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-muted-foreground"> / {currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={paidBy} onValueChange={(val) => {
                      setPaidBy(val);
                      setExtraPayment(0);
                    }}>
                      <SelectTrigger className="h-12 bg-background/50 border-border/40 rounded-xl px-4">
                        <SelectValue placeholder="Select a user" />
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
                  </div>
                  {extraPayment > 0 && (
                    <div className="w-32 relative">
                      <Input
                        type="number"
                        value={extraPayment}
                        onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                        className="h-12 bg-primary/10 border-primary/30 rounded-xl px-3 font-black text-primary text-xs"
                        placeholder="Extra"
                      />
                      <span className="absolute -top-4 right-1 text-[8px] font-black text-primary uppercase">Extra Payment</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Attendance ({presentCount})
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="edit-custom-split"
                    checked={customSplit}
                    onCheckedChange={setCustomSplit}
                  />
                  <Label htmlFor="edit-custom-split" className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground cursor-pointer">
                    Custom Split
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] font-black uppercase tracking-tighter px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => setPresentUserIds(new Set(users.map(u => u.id)))}
                >
                  SELECT ALL
                </Button>
              </div>
            </div>

            <div className={cn("grid gap-3 p-4 rounded-2xl bg-background/20 border-2 border-border/30 max-h-[220px] overflow-y-auto shadow-none custom-scrollbar", customSplit ? "grid-cols-1" : "grid-cols-2")}>
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10">
                  <Checkbox
                    id={`edit-user-${user.id}`}
                    checked={presentUserIds.has(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                    className="h-5 w-5 rounded-md border-primary/30"
                  />
                  <label
                    htmlFor={`edit-user-${user.id}`}
                    className="text-sm font-bold leading-none cursor-pointer select-none opacity-80 flex-1 min-w-0"
                  >
                    <UserLabel
                      name={user.name}
                      isMe={user.linked_user_id === currentUserId}
                      className="text-xs"
                    />
                  </label>
                  {customSplit && presentUserIds.has(user.id) && (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={customAmounts[user.id] ?? ""}
                      onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                      className="h-8 w-24 text-right text-xs font-black bg-background/50 border-primary/20 rounded-lg px-2"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="edit-notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">What Did Everyone Eat? (optional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="e.g. Chicken Biryani, Cold Drinks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] bg-background/50 border-border/40 rounded-xl px-4 py-3 resize-none"
            />
          </div>

          <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calculator className="h-12 w-12 text-primary" />
            </div>
            {customSplit ? (
              <>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    Custom Split Total
                  </span>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">
                    Entered / Total
                  </span>
                  <span className={cn(
                    "text-3xl font-black tracking-tighter",
                    Math.abs(customTotal - total) > 0.01 ? "text-red-500" : "text-emerald-500"
                  )}>
                    {currency}{customTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-base text-muted-foreground"> / {currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    New Calculation
                  </span>
                  <span>{currency}{total.toLocaleString()} ÷ {presentCount}</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">
                    Share / Person
                  </span>
                  <span className="text-3xl font-black text-primary tracking-tighter">
                    {currency}{sharePerPerson.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
            {extraPayment > 0 && (
              <div className="flex justify-between items-end pt-1 border-t border-primary/10">
                <span className="text-xs font-black uppercase tracking-widest opacity-80">
                  + Old Debt Payoff
                </span>
                <span className="text-lg font-black text-primary tracking-tighter">
                  {currency}{extraPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2 items-center">
            <Button
              type="button"
              variant="ghost"
              className="px-6 text-destructive hover:text-destructive hover:bg-destructive/10 uppercase text-xs font-black tracking-widest"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
            <Button
              type="submit"
              className="flex-1 h-14 text-base font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] rounded-xl border-2 border-primary/20 hover:border-primary/50 shadow-none"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Entry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
