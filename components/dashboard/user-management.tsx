"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, UserPlus, Loader2, Mail, ShieldCheck, User, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { addUser, deleteUser, updateUser, type LunchUser, type UserBalance } from "@/lib/actions"
import { UserLabel } from "./user-label"
import { createClient } from "@/lib/supabase/client"
import { getUserOrg } from "@/lib/org-actions"
import { toast } from "sonner"

interface MemberProfile {
  user_id: string
  email: string
  display_name: string | null
  role: string
}

interface UserManagementProps {
  users: LunchUser[]
  balances: UserBalance[]
  currentUserId?: string
  currency?: string
}

export function UserManagement({ users, balances, currentUserId, currency = "PKR" }: UserManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [availableMembers, setAvailableMembers] = useState<MemberProfile[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null)
  const [editingUser, setEditingUser] = useState<LunchUser | null>(null)
  const [editName, setEditName] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const loadAvailableMembers = useCallback(async () => {
    setLoadingMembers(true)
    const supabase = createClient()
    const org = await getUserOrg()
    if (!org) { setLoadingMembers(false); return }

    // Use the view we created
    const { data, error } = await supabase
      .from("org_member_profiles")
      .select("user_id, email, display_name, role")
      .eq("org_id", org.id)

    if (error || !data) {
      toast.error("Failed to load available members")
      setLoadingMembers(false)
      return
    }

    // Filter out those already in lunch tracking
    const trackedUserIds = new Set(users.map((u: any) => u.linked_user_id).filter(Boolean))
    const available = data.filter((m) => !trackedUserIds.has(m.user_id))
    setAvailableMembers(available)
    setLoadingMembers(false)
  }, [users])

  const handleOpenDialog = () => {
    setIsDialogOpen(true)
    setSelectedMember(null)
    setAddError(null)
    loadAvailableMembers()
  }

  const handleAddMember = () => {
    if (!selectedMember) return
    setAddError(null)
    startTransition(async () => {
      const displayName = selectedMember.display_name || selectedMember.email.split("@")[0]
      const result = await addUser(displayName, selectedMember.user_id)
      if (result.success) {
        setIsDialogOpen(false)
        setSelectedMember(null)
      } else {
        setAddError(result.error || "Failed to add user")
      }
    })
  }

  const handleEditUser = (user: LunchUser) => {
    setEditingUser(user)
    setEditName(user.name)
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = () => {
    if (!editingUser) return
    startTransition(async () => {
      const result = await updateUser(editingUser.id, editName)
      if (result.success) {
        toast.success("Member name updated")
        setIsEditDialogOpen(false)
        setEditingUser(null)
      } else {
        toast.error(result.error || "Failed to update member name")
      }
    })
  }

  const handleDeleteUser = (userId: string, name: string) => {
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.success) {
        toast.success(`Removed ${name} from tracking`)
      } else {
        toast.error(result.error || "Failed to remove member")
      }
    })
  }

  const getBalanceForUser = (userId: string) => {
    return balances.find((b) => b.id === userId)
  }

  return (
    <Card className="border-2 border-border/50 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
      <CardHeader className="pb-4 pt-8 px-6 md:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              Member Tracking
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                {users.length} Tracked
              </Badge>
            </CardTitle>
            <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">Control which team members are tracked for lunch expenses</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 rounded-xl font-black uppercase tracking-widest px-6 border-2 border-primary/20 hover:border-primary/50 shadow-none transition-all active:scale-95" onClick={handleOpenDialog}>
                <UserPlus className="mr-2 h-5 w-5" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem] border-2 border-border/50 shadow-none backdrop-blur-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Add Member</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Select a team member who has already accepted their invite.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-3">
                {loadingMembers ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : availableMembers.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground animate-in fade-in duration-500">
                    <div className="p-5 bg-muted/50 rounded-2xl">
                      <UserPlus className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-black uppercase tracking-tight text-foreground">No members available</p>
                      <p className="text-xs max-w-[200px] leading-relaxed font-medium">
                        All team members are already being tracked.
                      </p>
                    </div>
                    <Button variant="outline" className="mt-4 rounded-xl border-2 hover:border-primary/50 font-black uppercase tracking-widest text-[10px] h-12 px-6" asChild>
                      <a href="/admin/settings">
                        Invite More
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10">
                    {availableMembers.map((member) => (
                      <button
                        key={member.user_id}
                        onClick={() => setSelectedMember(member)}
                        className={cn(
                          "w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                          selectedMember?.user_id === member.user_id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-transparent hover:border-primary/30 hover:bg-muted/50 bg-muted/20"
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-xs font-black text-primary">
                            {(member.display_name || member.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {member.display_name && (
                            <p className="text-sm font-black uppercase tracking-tight truncate">{member.display_name}</p>
                          )}
                          <p className={cn("text-[10px] uppercase font-bold tracking-wider truncate", member.display_name ? "text-muted-foreground/60" : "text-sm text-foreground")}>
                            <Mail className="h-3 w-3 inline mr-1 opacity-40" />
                            {member.email}
                          </p>
                        </div>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"} className="shrink-0 text-[9px] font-black uppercase tracking-widest h-6">
                          {member.role === "admin" ? <ShieldCheck className="h-3 w-3 mr-1" /> : null}
                          {member.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
  
                {addError && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-in shake-1">
                    {addError}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-3 sm:gap-0">
                <Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-xs h-12" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 sm:flex-none rounded-xl font-black uppercase tracking-widest text-xs h-12 border-2 border-primary/20 hover:border-primary/50 shadow-none"
                  onClick={handleAddMember}
                  disabled={!selectedMember || isPending || loadingMembers}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Confirm Add"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-10">
        <div className="relative group/scroll">
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/20 to-transparent pointer-events-none z-10 lg:hidden group-hover/scroll:opacity-0 transition-opacity" />
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            <Table className="min-w-[600px] lg:min-w-full">
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5 border-none h-14">
                  <TableHead className="py-4 px-10 text-left font-black text-primary uppercase text-[10px] tracking-widest border-r border-primary/5">Identity</TableHead>
                  <TableHead className="font-black text-primary text-[10px] uppercase tracking-[0.2em] text-center">Activity</TableHead>
                  <TableHead className="font-black text-primary text-[10px] uppercase tracking-[0.2em] text-center">Balance Status</TableHead>
                  <TableHead className="px-6 font-black text-primary text-[10px] uppercase tracking-[0.2em] text-center">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const balance = getBalanceForUser(user.id)
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors border-b border-border/20 last:border-none group">
                      <TableCell className="py-6 px-10 text-left font-bold text-sm tracking-tight border-r border-primary/5">
                        <div className="flex items-center justify-start gap-3 transition-transform group-hover:translate-x-1 duration-300">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0 group-hover:scale-110 transition-transform border border-primary/20 shadow-none">
                            <span className="text-xs font-black text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <UserLabel 
                            name={user.name} 
                            isMe={user.linked_user_id === currentUserId} 
                            className="text-sm font-black uppercase tracking-tight"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-center">
                        <div className="inline-flex flex-col">
                          <span className="text-sm font-black tabular-nums">{balance?.daysPresent || 0}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Days Tracked</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-center">
                        <div className={cn(
                          "inline-flex flex-col px-4 py-2 rounded-2xl transition-all",
                          (balance?.balance || 0) > 0 ? "bg-emerald-500/5" : (balance?.balance || 0) < 0 ? "bg-red-500/5" : "bg-muted/50"
                        )}>
                          <span className={cn(
                            "text-sm font-black tabular-nums",
                            (balance?.balance || 0) > 0 ? "text-emerald-500" : (balance?.balance || 0) < 0 ? "text-red-500" : "text-muted-foreground/40"
                          )}>
                            {(balance?.balance || 0) >= 0 ? "+" : ""}{currency} {(balance?.balance || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Current Net</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                            onClick={() => handleEditUser(user)}
                            disabled={isPending}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90"
                                disabled={isPending}
                              >
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem] border-2 border-destructive/20 shadow-none backdrop-blur-3xl p-8">
                              <AlertDialogHeader>
                                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
                                  <Trash2 className="h-8 w-8 text-destructive" />
                                </div>
                                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-center">Remove Tracker?</AlertDialogTitle>
                                <AlertDialogDescription className="text-center text-sm font-medium leading-relaxed">
                                  Are you certain you want to stop tracking <span className="font-black text-foreground">{user.name}</span>? This will wipe their history but keep their team membership intact.
                                  {balance && balance.balance != null && balance.balance !== 0 && (
                                    <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold text-xs uppercase tracking-tight">
                                      Critical: They have a balance of {currency} {balance.balance.toLocaleString()}
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-8 gap-4">
                                <AlertDialogCancel className="h-14 rounded-xl font-black uppercase tracking-widest text-xs border-2">Keep Member</AlertDialogCancel>
                                <AlertDialogAction
                                  className="h-14 rounded-xl font-black uppercase tracking-widest text-xs bg-destructive text-white hover:bg-destructive/90 border-2 border-destructive/30 shadow-none"
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                >
                                  Wipe & Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-20 bg-muted/5">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                        <User className="h-12 w-12" />
                        <div className="space-y-1">
                          <p className="text-base font-black uppercase tracking-tight">No Tracked Members</p>
                          <p className="text-xs font-bold uppercase tracking-widest">Add members to start monitoring lunch debt</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-2 border-border/50 shadow-none backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Edit Member Name</DialogTitle>
            <DialogDescription className="text-sm font-medium">
              Change how this member appears across the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-2">
            <label className="text-xs font-black uppercase tracking-widest opacity-60">Display Name</label>
            <input
              autoFocus
              className="w-full h-12 bg-background border-2 border-border/50 rounded-xl px-4 font-bold text-sm focus:border-primary outline-none transition-all"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter name"
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateUser()}
            />
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-xs h-12" onClick={() => setIsEditDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="flex-1 sm:flex-none rounded-xl font-black uppercase tracking-widest text-xs h-12 border-2 border-primary/20 hover:border-primary/50 shadow-none"
              onClick={handleUpdateUser}
              disabled={isPending || !editName.trim()}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
