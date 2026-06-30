import { DailyLunchTracker } from "@/components/dashboard/daily-lunch-tracker"
import { TopNavbar } from "@/components/dashboard/top-navbar"
import { getUserOrg } from "@/lib/org-actions"
import { getDailyLunchData, getCurrentUser } from "@/lib/actions"

export const dynamic = "force-dynamic"

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default async function LunchPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const month = params.month || getCurrentMonthKey()

  const [data, org, user] = await Promise.all([
    getDailyLunchData(month),
    getUserOrg(),
    getCurrentUser()
  ])

  const { entries, users } = data as { entries: any[], users: any[] }
  const currentUserId = user?.id

  return (
    <div className="flex flex-col h-full">
      <TopNavbar title="Daily Lunch Tracker" />
      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
        <DailyLunchTracker
          entries={entries}
          users={users}
          currency={org?.currency || "₹"}
          currentUserId={currentUserId}
          isAdmin={org?.role === "admin"}
          month={month}
        />
      </div>
    </div>
  )
}
