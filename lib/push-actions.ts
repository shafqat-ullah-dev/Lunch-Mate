"use server"

import webpush from "web-push"
import { createClient } from "@/lib/supabase/server"
import { getAuthorizedOrgId } from "./org-actions"

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    vapidPublicKey,
    vapidPrivateKey
  )
}

type PushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function subscribeToPush(
  subscription: PushSubscriptionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthorizedOrgId()
    if (!auth) return { success: false, error: "No organization found" }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        org_id: auth.orgId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "endpoint" }
    )

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function unsubscribeFromPush(endpoint: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Fan out a push notification to every subscribed member of an org, except the one who triggered it.
export async function notifyOrgMembers(
  orgId: string,
  excludeUserId: string | undefined,
  payload: { title: string; body: string; url?: string }
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("notifyOrgMembers: VAPID keys not configured, skipping push")
    return
  }

  const supabase = await createClient()
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .eq("org_id", orgId)

  if (subsError) {
    console.error("notifyOrgMembers: failed to load subscriptions", subsError.message)
    return
  }
  if (!subs || subs.length === 0) return

  const recipients = subs.filter((s) => s.user_id !== excludeUserId)

  const results = await Promise.allSettled(
    recipients.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
        .catch(async (err: any) => {
          // Subscription is gone on the browser's end; clean it up.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint)
          } else {
            console.error("notifyOrgMembers: push send failed", err?.statusCode, err?.body || err?.message)
          }
          throw err
        })
    )
  )

  const failures = results.filter((r) => r.status === "rejected").length
  if (failures > 0) {
    console.error(`notifyOrgMembers: ${failures}/${recipients.length} pushes failed`)
  }
}
