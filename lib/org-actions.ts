"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { cache } from "react"

export const getUserOrgs = cache(async () => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Try fetching with currency first
    let { data: memberships, error } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(name, currency)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // If currency column is missing, fallback to name only
    if (error && error.message.includes("currency")) {
      console.warn("Currency column missing, falling back...")
      const retry = await supabase
        .from("organization_members")
        .select("org_id, role, organizations(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      memberships = retry.data as any
      error = retry.error
    }

    if (error) {
      console.error("DEBUG ERROR getUserOrgs:", JSON.stringify(error))
      return []
    }

    if (!memberships) return []

    return memberships.map(m => {
      const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
      return {
        id: m.org_id,
        role: m.role,
        name: (org as any)?.name || "Lunch Mate",
        currency: (org as any)?.currency || ""
      }
    })
  } catch (e: any) {
    console.error("DEBUG CRASH getUserOrgs:", e.message)
    return []
  }
})

export const getUserOrg = cache(async () => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Try fetching with currency first
    let { data: memberships, error } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(name, currency)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // If currency column is missing, fallback to name only
    if (error && error.message.includes("currency")) {
      console.warn("Currency column missing in getUserOrg, falling back...")
      const retry = await supabase
        .from("organization_members")
        .select("org_id, role, organizations(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      memberships = retry.data as any
      error = retry.error
    }

    if (error) {
       console.error("DEBUG ERROR getUserOrg:", JSON.stringify(error))
       return null
    }

    if (!memberships || memberships.length === 0) return null

    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get("active_org_id")?.value
    
    // Find the one matching the cookie, or just take the first
    const membership = (activeOrgId ? memberships.find(m => m.org_id === activeOrgId) : null) || memberships[0]
    const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

    return {
      id: membership.org_id,
      role: membership.role,
      name: (org as any)?.name || "Lunch Mate",
      currency: (org as any)?.currency || ""
    }
  } catch (e: any) {
    console.error("DEBUG CRASH getUserOrg:", e.message)
    return null
  }
})

export async function setActiveOrg(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set("active_org_id", orgId, { path: "/" })
  revalidatePath("/", "layout")
  return { success: true }
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const name = formData.get("name") as string

  // 1. Create Organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single()

  if (orgError) return { error: orgError.message }

  // 2. Add creator as Admin member
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: "admin"
    })

  if (memberError) return { error: memberError.message }

  revalidatePath("/", "layout")
  redirect("/admin")
}

export async function deleteOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId)
    .eq("owner_id", user.id)

  if (error) return { error: error.message }

  const cookieStore = await cookies()
  if (cookieStore.get("active_org_id")?.value === orgId) {
    cookieStore.delete("active_org_id")
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateOrganizationCurrency(orgId: string, currency: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("organizations")
    .update({ currency })
    .eq("id", orgId)

  if (error) return { error: error.message }

  revalidatePath("/", "layout")
  return { success: true }
}

export const getAuthorizedOrgId = cache(async () => {
  const org = await getUserOrg()
  if (!org) return null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return { 
    orgId: org.id, 
    role: org.role,
    userId: user?.id
  }
})

export async function getOrgOwnerId(): Promise<string | null> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return null
  const supabase = await createClient()

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", auth.orgId)
    .single()

  return org?.owner_id || null
}

export async function getOrgMemberRoles(): Promise<{ userId: string; role: string }[]> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return []
  const supabase = await createClient()

  const { data } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", auth.orgId)

  return (data || []).map((m) => ({ userId: m.user_id, role: m.role }))
}

export async function updateMemberRole(
  targetUserId: string,
  role: "admin" | "member"
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return { success: false, error: "Unauthorized" }
  if (auth.role !== "admin") return { success: false, error: "Only admins can change member roles" }

  const supabase = await createClient()

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", auth.orgId)
    .single()

  if (role === "member" && org?.owner_id === targetUserId) {
    return { success: false, error: "The organization owner must remain an admin" }
  }

  if (role === "member" && targetUserId === auth.userId) {
    const { count } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("role", "admin")
    if ((count || 0) <= 1) {
      return { success: false, error: "You are the only admin. Promote someone else first." }
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("org_id", auth.orgId)
    .eq("user_id", targetUserId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/admin")
  revalidatePath("/admin/users")
  revalidatePath("/user")
  return { success: true }
}

export async function getOrgMembersNotInLunchTracking() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const auth = await getAuthorizedOrgId()
  if (!auth) return []

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", auth.orgId)

  if (!members || members.length === 0) return []

  const { data: lunchUsers } = await supabase
    .from("lunch_users")
    .select("linked_user_id")
    .eq("org_id", auth.orgId)
    .not("linked_user_id", "is", null)

  const alreadyTrackedIds = new Set((lunchUsers || []).map((u) => u.linked_user_id))
  const untracked = members.filter((m) => !alreadyTrackedIds.has(m.user_id))

  return untracked.map((m) => ({
    userId: m.user_id,
    role: m.role,
  }))
}
