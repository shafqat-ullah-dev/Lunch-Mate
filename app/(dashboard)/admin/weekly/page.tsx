import { getWeeklySummary, getCurrentUser } from "@/lib/actions"
import { getUserOrg } from "@/lib/org-actions"
import { WeeklySummary } from "@/components/dashboard/weekly-summary"
import { TopNavbar } from "@/components/dashboard/top-navbar"

export const dynamic = "force-dynamic"

export default async function WeeklyPage() {
  const [{ weeks, users, overallBalances }, org, user] = await Promise.all([
    getWeeklySummary(),
    getUserOrg(),
    getCurrentUser(),
  ])

  return (
    <div className="flex flex-col h-full">
      <TopNavbar title="Weekly Summary" />
      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
        <WeeklySummary
          weeks={weeks}
          users={users}
          overallBalances={overallBalances}
          currency={org?.currency || "₹"}
          currentUserId={user?.id}
        />
      </div>
    </div>
  )
}
