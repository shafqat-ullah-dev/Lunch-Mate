import { getMonthlySummary, getCurrentUser } from "@/lib/actions"
import { getUserOrg } from "@/lib/org-actions"
import { MonthlySummary } from "@/components/dashboard/monthly-summary"
import { TopNavbar } from "@/components/dashboard/top-navbar"

export const dynamic = "force-dynamic"

export default async function MonthlyPage() {
  const [{ months, users }, org, user] = await Promise.all([
    getMonthlySummary(),
    getUserOrg(),
    getCurrentUser(),
  ])

  return (
    <div className="flex flex-col h-full">
      <TopNavbar title="Monthly Summary" />
      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">
        <MonthlySummary
          months={months}
          users={users}
          currency={org?.currency || "₹"}
          currentUserId={user?.id}
        />
      </div>
    </div>
  )
}
