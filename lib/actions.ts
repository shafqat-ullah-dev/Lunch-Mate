"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthorizedOrgId } from "./org-actions"

// Get current user profile
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export type LunchUser = {
  id: string
  name: string
  org_id: string
  linked_user_id: string | null  // UUID of the auth.users account
  created_at: string
}

export type LunchEntry = {
  id: string
  date: string
  total_expense: number
  org_id: string
  created_at: string
}

export type LunchShare = {
  id: string
  entry_id: string
  user_id: string
  share_amount: number
  org_id: string
}

export type LunchPayment = {
  id: string
  entry_id: string
  user_id: string
  paid_amount: number
  org_id: string
}

export type UserBalance = {
  id: string
  name: string
  linked_user_id: string | null
  totalPaid: number
  totalShares: number
  balance: number
  daysPresent: number
}

export type EntryWithDetails = {
  id: string
  date: string
  total_expense: number
  shares: { user_id: string; user_name: string; share_amount: number }[]
  payments: { user_id: string; user_name: string; paid_amount: number }[]
}

// Fetch all users for the current org
export async function getUsers(): Promise<LunchUser[]> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return []
  const { orgId } = auth
  const supabase = await createClient()
  
  // 1. Get current tracker users
  let { data: trackerUsers, error: fetchError } = await supabase
    .from("lunch_users")
    .select("*")
    .eq("org_id", orgId)
    .order("name")

  if (fetchError) return []

  // 2. Quick check if generic names need updating
  const isGeneric = (name: string) => {
    const n = (name || "").trim().toUpperCase();
    return !n || n.includes("TEAM MEMBER") || n.includes("MEMBER (ME)") || n === "MEMBER" || n === "USER" || n === "LUNCH MATE";
  };

  const genericUsers = trackerUsers?.filter(u => isGeneric(u.name) && u.linked_user_id) || []

  // 3. Sync names if needed
  if (genericUsers.length > 0) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const adminSupabase = createAdminClient()
      
      await Promise.all(genericUsers.map(async (gUser) => {
        try {
          const { data: { user } } = await adminSupabase.auth.admin.getUserById(gUser.linked_user_id!)
          if (user) {
            const fullName = user.user_metadata?.full_name;
            const emailPrefix = user.email?.split("@")[0];
            const displayName = (fullName && !isGeneric(fullName)) ? fullName : (emailPrefix || "User");
            
            if (displayName && !isGeneric(displayName)) {
              await supabase.from("lunch_users")
                .update({ name: displayName })
                .eq("id", gUser.id)
            }
          }
        } catch (e) {}
      }))

      // Re-fetch since we updated names
      const { data: updated } = await supabase
        .from("lunch_users")
        .select("*")
        .eq("org_id", orgId)
        .order("name")
      trackerUsers = updated || []
    } catch (adminErr) {
      console.warn("Name sync skipped:", adminErr)
    }
  }

  // Deduplication and final return
  const uniqueUsers: LunchUser[] = []
  const seenLinkedIds = new Set<string>()
  const seenNames = new Set<string>()

  const sortedUsers = [...(trackerUsers || [])].sort((a, b) => {
    if (a.linked_user_id && !b.linked_user_id) return -1
    if (!a.linked_user_id && b.linked_user_id) return 1
    return 0
  })

  for (const u of sortedUsers) {
    const nameKey = u.name.toLowerCase().trim()
    if (u.linked_user_id && seenLinkedIds.has(u.linked_user_id)) continue
    if (seenNames.has(nameKey)) continue

    uniqueUsers.push(u)
    if (u.linked_user_id) seenLinkedIds.add(u.linked_user_id)
    seenNames.add(nameKey)
  }

  return uniqueUsers.sort((a, b) => a.name.localeCompare(b.name))
}

// Add a member of this org to lunch tracking (they must have an account)
// linked_user_id = their auth.users UUID; name = display label
export async function addUser(
  name: string,
  linkedUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can add users" }

    const supabase = await createClient()

    // Verify this user is actually a member of this org
    const { data: isMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", linkedUserId)
      .single()

    if (!isMember) {
      return { success: false, error: "This user doesn't belong to your team. Invite them first." }
    }

    // Check if already added to lunch tracking
    const { data: alreadyAdded } = await supabase
      .from("lunch_users")
      .select("id")
      .eq("org_id", orgId)
      .eq("linked_user_id", linkedUserId)
      .single()

    if (alreadyAdded) {
      return { success: false, error: "This member is already being tracked." }
    }

    const { error } = await supabase
      .from("lunch_users")
      .insert({ name, org_id: orgId, linked_user_id: linkedUserId })

    if (error) {
      console.error("Error adding user:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Update a user (e.g. change their name)
export async function updateUser(userId: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can update users" }

    const supabase = await createClient()
    const { error } = await supabase
      .from("lunch_users")
      .update({ name })
      .eq("id", userId)
      .eq("org_id", orgId)

    if (error) {
      console.error("Error updating user:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    revalidatePath("/admin/users")
    revalidatePath("/user")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Delete a user (and cascade delete their shares/payments)
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can delete users" }

    const supabase = await createClient()
    const { error } = await supabase
      .from("lunch_users")
      .delete()
      .eq("id", userId)
      .eq("org_id", orgId) // Extra safety

    if (error) {
      console.error("Error deleting user:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    revalidatePath("/admin/users")
    revalidatePath("/user")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Fetch all entries for the current org with optional month filter
export async function getEntries(month?: string): Promise<LunchEntry[]> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return []
  const { orgId } = auth
  const supabase = await createClient()
  
  let query = supabase
    .from("lunch_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("date", { ascending: true })

  if (month) {
    const [year, monthNum] = month.split("-")
    const startDate = `${year}-${monthNum}-01`
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split("T")[0]
    query = query.gte("date", startDate).lte("date", endDate)
  }

  const { data, error } = await query
  if (error) {
    console.error("Error fetching entries:", error)
    return []
  }
  return data || []
}

// Fetch user balances for current org
export async function getUserBalances(): Promise<UserBalance[]> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return []
  const { orgId } = auth
  const supabase = await createClient()

  // Get all users in org (synced)
  const users = await getUsers()
  if (!users) return []

  // Fetch all raw data directly to avoid circular dependency with getDailyLunchData
  const [entriesRes, sharesRes, paymentsRes] = await Promise.all([
    supabase.from("lunch_entries").select("*").eq("org_id", orgId).order("date", { ascending: true }),
    supabase.from("lunch_shares").select("*").eq("org_id", orgId),
    supabase.from("lunch_payments").select("*").eq("org_id", orgId)
  ])

  const entries = entriesRes.data || []
  const shares = sharesRes.data || []
  const payments = paymentsRes.data || []

  // Process entries to calculate settlement-aware balances
  const processedEntries = entries.map((entry) => {
    const entryShares = shares.filter((s) => s.entry_id === entry.id)
    const entryPayments = payments.filter((p) => p.entry_id === entry.id)

    const userDetails = users.map((user) => {
      const share = entryShares.find((s) => s.user_id === user.id)
      const payment = entryPayments.find((p) => p.user_id === user.id)
      const shareAmount = share ? Number(share.share_amount) : 0
      const paidAmount = payment ? Number(payment.paid_amount) : 0

      return {
        userId: user.id,
        userName: user.name,
        linked_user_id: user.linked_user_id,
        isPresent: shareAmount > 0,
        share: shareAmount,
        paid: paidAmount,
      }
    })

    const settledDetails = calculateSettlementAwareBalances(Number(entry.total_expense), userDetails)
    return { id: entry.id, userDetails: settledDetails }
  })

  return users.map((user) => {
    const userEntries = processedEntries.map((e) => e.userDetails.find((ud) => ud.userId === user.id))
    const totalPaid = userEntries.reduce((sum: number, ud) => sum + (ud?.paid || 0), 0)
    const totalShares = userEntries.reduce((sum: number, ud) => sum + (ud?.share || 0), 0)
    const totalBalance = userEntries.reduce((sum: number, ud) => sum + (ud?.balance || 0), 0)

    let finalBalance = Math.round(totalBalance * 100) / 100
    if (Math.abs(finalBalance) < 1) finalBalance = 0

    return {
      id: user.id,
      name: user.name,
      linked_user_id: user.linked_user_id,
      totalPaid,
      totalShares,
      balance: finalBalance,
      daysPresent: userEntries.filter((ud) => ud?.isPresent).length,
    }
  })
}

// Get entries with full details for current org
export async function getEntriesWithDetails(month?: string): Promise<EntryWithDetails[]> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return []
  const { orgId } = auth
  const supabase = await createClient()

  let entriesQuery = supabase
    .from("lunch_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("date", { ascending: true })

  if (month) {
    const [year, monthNum] = month.split("-")
    const startDate = `${year}-${monthNum}-01`
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split("T")[0]
    entriesQuery = entriesQuery.gte("date", startDate).lte("date", endDate)
  }

  const { data: entries } = await entriesQuery
  if (!entries) return []

  const { data: users } = await supabase.from("lunch_users").select("id, name").eq("org_id", orgId)
  const userMap = new Map(users?.map((u) => [u.id, u.name]) || [])

  const entryIds = entries.map((e) => e.id)
  const { data: shares } = await supabase.from("lunch_shares").select("*").in("entry_id", entryIds).eq("org_id", orgId)
  const { data: payments } = await supabase.from("lunch_payments").select("*").in("entry_id", entryIds).eq("org_id", orgId)

  return entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    total_expense: Number(entry.total_expense),
    shares: shares?.filter((s) => s.entry_id === entry.id).map((s) => ({
      user_id: s.user_id,
      user_name: userMap.get(s.user_id) || "Unknown",
      share_amount: Number(s.share_amount),
    })) || [],
    payments: payments?.filter((p) => p.entry_id === entry.id).map((p) => ({
      user_id: p.user_id,
      user_name: userMap.get(p.user_id) || "Unknown",
      paid_amount: Number(p.paid_amount),
    })) || [],
  }))
}

// Add a new lunch entry to current org
export async function addEntry(data: {
  date: string
  totalExpense: number
  shares: { userId: string; amount: number }[]
  payments: { userId: string; amount: number }[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can add entries" }

    const supabase = await createClient()

    const { data: entry, error: entryError } = await supabase
      .from("lunch_entries")
      .insert({ date: data.date, total_expense: data.totalExpense, org_id: orgId })
      .select()
      .single()

    if (entryError || !entry) return { success: false, error: entryError?.message }

    if (data.shares.length > 0) {
      await supabase.from("lunch_shares").insert(
        data.shares.map((s) => ({ entry_id: entry.id, user_id: s.userId, share_amount: s.amount, org_id: orgId }))
      )
    }

    if (data.payments.length > 0) {
      await supabase.from("lunch_payments").insert(
        data.payments.map((p) => ({ entry_id: entry.id, user_id: p.userId, paid_amount: p.amount, org_id: orgId }))
      )
    }

    revalidatePath("/admin")
    revalidatePath("/user")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Delete an entry
export async function deleteEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can delete entries" }

    const supabase = await createClient()
    const { error } = await supabase
      .from("lunch_entries")
      .delete()
      .eq("id", entryId)
      .eq("org_id", orgId)

    if (error) return { success: false, error: error.message }

    revalidatePath("/admin")
    revalidatePath("/user")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Update an existing entry
export async function updateEntry(
  entryId: string,
  data: {
    date: string
    totalExpense: number
    shares: { userId: string; amount: number }[]
    payments: { userId: string; amount: number }[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can edit entries" }

    const supabase = await createClient()

    // 1. Update the main entry
    const { error: entryError } = await supabase
      .from("lunch_entries")
      .update({ date: data.date, total_expense: data.totalExpense })
      .eq("id", entryId)
      .eq("org_id", orgId)

    if (entryError) return { success: false, error: entryError.message }

    // 2. Delete existing shares/payments
    await supabase.from("lunch_shares").delete().eq("entry_id", entryId)
    await supabase.from("lunch_payments").delete().eq("entry_id", entryId)

    // 3. Insert new shares
    if (data.shares.length > 0) {
      await supabase.from("lunch_shares").insert(
        data.shares.map((s) => ({ entry_id: entryId, user_id: s.userId, share_amount: s.amount, org_id: orgId }))
      )
    }

    // 4. Insert new payments
    if (data.payments.length > 0) {
      await supabase.from("lunch_payments").insert(
        data.payments.map((p) => ({ entry_id: entryId, user_id: p.userId, paid_amount: p.amount, org_id: orgId }))
      )
    }

    revalidatePath("/admin")
    revalidatePath("/user")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Get summary statistics for current org
export async function getStats() {
  const auth = await getAuthorizedOrgId()
  if (!auth) {
    return { totalExpense: 0, totalPaid: 0, netBalance: 0, totalEntries: 0 }
  }
  const { orgId } = auth
  const supabase = await createClient()

  const { data: entries } = await supabase.from("lunch_entries").select("total_expense").eq("org_id", orgId)
  const { data: payments } = await supabase.from("lunch_payments").select("paid_amount").eq("org_id", orgId)

  const totalExpense = entries?.reduce((sum, e) => sum + Number(e.total_expense), 0) || 0
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.paid_amount), 0) || 0

  return {
    totalExpense,
    totalPaid,
    netBalance: totalPaid - totalExpense,
    totalEntries: entries?.length || 0,
  }
}

// Get spending trend data for current org
export async function getSpendingTrend(month?: string) {
  const entries = await getEntries(month)
  return entries
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => ({
      date: entry.date,
      expense: Number(entry.total_expense),
    }))
}

// Get contribution data for current org
export async function getContributionData() {
  const balances = await getUserBalances()
  return balances.map((b) => ({
    name: b.name,
    paid: b.totalPaid,
    shares: b.totalShares,
  }))
}

// Get weekly summary data for current org
export async function getWeeklySummary() {
  const auth = await getAuthorizedOrgId()
  if (!auth) return { weeks: [], users: [], overallBalances: [] }
  const { orgId } = auth
  const supabase = await createClient()

  const users = await getUsers()
  
  // Parallelize database fetches
  const [entriesRes, sharesRes, paymentsRes] = await Promise.all([
    supabase.from("lunch_entries").select("*").eq("org_id", orgId).order("date", { ascending: true }),
    supabase.from("lunch_shares").select("*").eq("org_id", orgId),
    supabase.from("lunch_payments").select("*").eq("org_id", orgId)
  ])

  const { data: entries } = entriesRes
  const { data: shares } = sharesRes
  const { data: payments } = paymentsRes

  if (!entries || !users) return { weeks: [], users: [], overallBalances: [] }

  const getWeekStart = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(date.setDate(diff))
    return weekStart.toISOString().split("T")[0]
  }

  const weekMap = new Map<string, any>()

  entries.forEach((entry) => {
    const weekStart = getWeekStart(entry.date)
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { weekStart, totalExpense: 0, entries: [] })
    }
    const week = weekMap.get(weekStart)
    week.totalExpense += Number(entry.total_expense)
    week.entries.push(entry)
  })

  const weeks = Array.from(weekMap.values()).map((week) => {
    const entryIds = week.entries.map((e: any) => e.id)
    const weekShares = shares?.filter((s) => entryIds.includes(s.entry_id)) || []
    const weekPayments = payments?.filter((p) => entryIds.includes(p.entry_id)) || []

    const weekEntryDetails: LunchEntryDetail[] = week.entries.map((entry: any) => {
      const entryShares = weekShares.filter((s) => s.entry_id === entry.id)
      const entryPayments = weekPayments.filter((p) => p.entry_id === entry.id)

      const userDetails = users.map((user) => {
        const share = entryShares.find((s) => s.user_id === user.id)
        const payment = entryPayments.find((p) => p.user_id === user.id)
        const shareAmount = share ? Number(share.share_amount) : 0
        const paidAmount = payment ? Number(payment.paid_amount) : 0
        return {
          userId: user.id,
          userName: user.name,
          isPresent: !!share,
          share: shareAmount,
          paid: paidAmount,
        }
      })

      return {
        id: entry.id,
        date: entry.date,
        totalExpense: Number(entry.total_expense),
        userDetails: calculateSettlementAwareBalances(Number(entry.total_expense), userDetails),
      }
    })

    const userStats = users.map((user) => {
      const userWeekEntries = weekEntryDetails.map((e) => e.userDetails.find((ud: UserSettlementDetail) => ud.userId === user.id))
      const totalPaid = userWeekEntries.reduce((sum: number, ud: UserSettlementDetail | undefined) => sum + (ud?.paid || 0), 0)
      const totalShares = userWeekEntries.reduce((sum: number, ud: UserSettlementDetail | undefined) => sum + (ud?.share || 0), 0)
      const totalBalance = userWeekEntries.reduce((sum: number, ud: UserSettlementDetail | undefined) => sum + (ud?.balance || 0), 0)

      let finalBalance = Math.round(totalBalance * 100) / 100
      if (Math.abs(finalBalance) < 1) finalBalance = 0

      return {
        userId: user.id,
        userName: user.name,
        paid: totalPaid,
        shares: totalShares,
        balance: finalBalance,
      }
    })

    return {
      weekStart: week.weekStart,
      totalExpense: week.totalExpense,
      userStats,
      entries: weekEntryDetails,
    }
  }).sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())

  const overallBalances = users.map((user) => {
    const totalBalance = weeks.reduce((sum, week) => {
      const userStat = week.userStats.find((s: any) => s.userId === user.id)
      return sum + (userStat?.balance || 0)
    }, 0)
    return {
      userId: user.id,
      userName: user.name,
      balance: Math.round(totalBalance * 100) / 100,
    }
  })

  return { weeks, users, overallBalances }
}

// Get monthly summary data for current org
export async function getMonthlySummary() {
  const auth = await getAuthorizedOrgId()
  if (!auth) return { months: [], users: [] }
  const { orgId } = auth
  const supabase = await createClient()

  const users = await getUsers()
  
  // Parallelize database fetches
  const [entriesRes, sharesRes, paymentsRes] = await Promise.all([
    supabase.from("lunch_entries").select("*").eq("org_id", orgId).order("date", { ascending: true }),
    supabase.from("lunch_shares").select("*").eq("org_id", orgId),
    supabase.from("lunch_payments").select("*").eq("org_id", orgId)
  ])

  const { data: entries } = entriesRes
  const { data: shares } = sharesRes
  const { data: payments } = paymentsRes

  if (!entries || !users) return { months: [], users: [] }

  const getMonthKey = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }

  const monthMap = new Map<string, any>()
  entries.forEach((entry) => {
    const key = getMonthKey(entry.date)
    if (!monthMap.has(key)) monthMap.set(key, { monthKey: key, totalExpense: 0, entries: [] })
    const month = monthMap.get(key)
    month.totalExpense += Number(entry.total_expense)
    month.entries.push(entry)
  })

  const months = Array.from(monthMap.values()).map((month) => {
    const entryIds = month.entries.map((e: any) => e.id)
    const monthEntryDetails: LunchEntryDetail[] = month.entries.map((entry: any) => {
      const entryShares = shares?.filter((s) => s.entry_id === entry.id) || []
      const entryPayments = payments?.filter((p) => p.entry_id === entry.id) || []

      const userDetails = users.map((user) => {
        const share = entryShares.find((s) => s.user_id === user.id)
        const payment = entryPayments.find((p) => p.user_id === user.id)
        const shareAmount = share ? Number(share.share_amount) : 0
        const paidAmount = payment ? Number(payment.paid_amount) : 0
        return {
          userId: user.id,
          userName: user.name,
          isPresent: !!share,
          share: shareAmount,
          paid: paidAmount,
        }
      })

      return {
        id: entry.id,
        date: entry.date,
        totalExpense: Number(entry.total_expense),
        userDetails: calculateSettlementAwareBalances(Number(entry.total_expense), userDetails),
      }
    })

    const userStats = users.map((user) => {
      const userMonthEntries = monthEntryDetails.map((e) => e.userDetails.find((ud: UserSettlementDetail) => ud.userId === user.id))
      const totalPaid = userMonthEntries.reduce((sum: number, ud: UserSettlementDetail | undefined) => sum + (ud?.paid || 0), 0)
      const totalShares = userMonthEntries.reduce((sum: number, ud: UserSettlementDetail | undefined) => sum + (ud?.share || 0), 0)
      const totalBalance = userMonthEntries.reduce((sum: number, ud: UserSettlementDetail | undefined) => sum + (ud?.balance || 0), 0)

      let finalBalance = Math.round(totalBalance * 100) / 100
      if (Math.abs(finalBalance) < 1) finalBalance = 0

      return {
        userId: user.id,
        userName: user.name,
        paid: totalPaid,
        shares: totalShares,
        balance: finalBalance,
      }
    })

    return { monthKey: month.monthKey, totalExpense: month.totalExpense, userStats, entries: monthEntryDetails }
  }).sort((a, b) => a.monthKey.localeCompare(b.monthKey))

  return { months, users }
}

export async function getDailyLunchData(month?: string) {
  const auth = await getAuthorizedOrgId()
  if (!auth) return { entries: [], users: [] }
  const { orgId } = auth
  const supabase = await createClient()

  const users = await getUsers()

  let entriesQuery = supabase
    .from("lunch_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("date", { ascending: true })

  if (month) {
    const [year, monthNum] = month.split("-")
    const startDate = `${year}-${monthNum}-01`
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split("T")[0]
    entriesQuery = entriesQuery.gte("date", startDate).lte("date", endDate)
  }

  const { data: entries } = await entriesQuery

  if (!entries || !users) return { entries: [], users: [] }

  const entryIds = entries.map((e) => e.id)

  // Parallelize remaining database fetches, scoped to the filtered entries
  const [sharesRes, paymentsRes] = await Promise.all([
    entryIds.length > 0
      ? supabase.from("lunch_shares").select("*").eq("org_id", orgId).in("entry_id", entryIds)
      : Promise.resolve({ data: [] }),
    entryIds.length > 0
      ? supabase.from("lunch_payments").select("*").eq("org_id", orgId).in("entry_id", entryIds)
      : Promise.resolve({ data: [] }),
  ])

  const { data: shares } = sharesRes
  const { data: payments } = paymentsRes

  const sortedEntries = entries || []

  // Get current total balances for "Paid All" functionality
  const balances = await getUserBalances()
  const balanceMap = new Map(balances.map(b => [b.id, b.balance]))

  const entriesWithDetails = sortedEntries.map((entry) => {
    const entryShares = shares?.filter((s) => s.entry_id === entry.id) || []
    const entryPayments = payments?.filter((p) => p.entry_id === entry.id) || []

    const userDetails = users.map((user) => {
      const share = entryShares.find((s) => s.user_id === user.id)
      const payment = entryPayments.find((p) => p.user_id === user.id)
      const shareAmount = share ? Number(share.share_amount) : 0
      const paidAmount = payment ? Number(payment.paid_amount) : 0

      return {
        userId: user.id,
        userName: user.name,
        linked_user_id: user.linked_user_id,
        isPresent: shareAmount > 0,
        share: shareAmount,
        paid: paidAmount,
        totalBalance: balanceMap.get(user.id) || 0,
      }
    })

    const settledDetails = calculateSettlementAwareBalances(Number(entry.total_expense), userDetails)

    return { id: entry.id, date: entry.date, totalExpense: Number(entry.total_expense), userDetails: settledDetails }
  })

  return { entries: entriesWithDetails.reverse(), users: users.map(u => ({ ...u, totalBalance: balanceMap.get(u.id) || 0 })) }
}

interface LunchEntryDetail {
  id: string
  date: string
  totalExpense: number
  userDetails: UserSettlementDetail[]
}

interface UserSettlementDetail {
  userId: string
  userName: string
  linked_user_id?: string | null
  isPresent: boolean
  share: number
  paid: number
  balance: number
  totalBalance?: number
}

function calculateSettlementAwareBalances(
  totalExpense: number,
  users: { userId: string; userName: string; linked_user_id?: string | null; isPresent: boolean; share: number; paid: number; totalBalance?: number }[]
): UserSettlementDetail[] {
  const totalPaid = users.reduce((sum: number, u) => sum + u.paid, 0)
  const excess = Math.max(0, totalPaid - totalExpense)

  if (excess <= 1.0) { // Small buffer for rounding
    return users.map(u => ({ ...u, balance: Math.round((u.paid - u.share) * 100) / 100 }))
  }

  const rawOverpaidList = users.map(u => ({
    userId: u.userId,
    overpaid: Math.max(0, u.paid - u.share)
  }))
  const totalOverpaidAmount = rawOverpaidList.reduce((sum: number, r) => sum + r.overpaid, 0)

  return users.map(u => {
    const userOverpaidAmount = Math.max(0, u.paid - u.share)
    // Distribute excess to those who paid more than their share (the primary payers)
    const reimbursement = totalOverpaidAmount > 0 ? (userOverpaidAmount / totalOverpaidAmount) * excess : 0
    
    // Balance is adjusted by reimbursement
    const balance = (u.paid - u.share) - reimbursement
    
    // Round to 2 decimal places to avoid floating point issues in UI
    let finalBalance = Math.round(balance * 100) / 100
    
    // If balance is between -1 and 1, treat it as 0 (covers small remaining debts/credits due to rounding)
    if (Math.abs(finalBalance) < 1) finalBalance = 0
    
    return {
      ...u,
      balance: finalBalance
    }
  })
}

// Settle historical debt for a user by applying payments to past entries where they owe money.
// If `amount` is provided, only that much is applied (oldest debts first); otherwise all debt is settled.
export async function settleUserDebt(userId: string, amount?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }
    const { orgId, role } = auth
    if (role !== 'admin') return { success: false, error: "Only admins can settle debt" }

    // Use getDailyLunchData to find all entries where user has a negative balance
    const { entries } = await getDailyLunchData()

    // Filter for entries where this user has debt (balance < 0), oldest first
    const debtEntries = entries
      .filter(e => {
        const detail = e.userDetails.find(ud => ud.userId === userId)
        return detail && detail.balance < 0
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (debtEntries.length === 0) return { success: true }

    const supabase = await createClient()

    // Process each debt entry - adding a payment record for the debtor
    // to cover their specific share deficit on that day, capped by `amount` if given.
    let remaining = amount
    const inserts: { entry_id: string; user_id: string; paid_amount: number; org_id: string }[] = []
    for (const entry of debtEntries) {
      if (remaining !== undefined && remaining <= 0) break

      const detail = entry.userDetails.find(ud => ud.userId === userId)
      if (!detail) continue

      const debtAmount = Math.abs(detail.balance)
      const payAmount = remaining !== undefined ? Math.min(debtAmount, remaining) : debtAmount
      if (payAmount <= 0) continue

      inserts.push({ entry_id: entry.id, user_id: userId, paid_amount: payAmount, org_id: orgId })
      if (remaining !== undefined) remaining -= payAmount
    }

    if (inserts.length === 0) return { success: true }

    const { error } = await supabase.from("lunch_payments").insert(inserts)
    if (error) return { success: false, error: error.message }

    revalidatePath("/admin")
    revalidatePath("/admin/lunch")
    revalidatePath("/user")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
