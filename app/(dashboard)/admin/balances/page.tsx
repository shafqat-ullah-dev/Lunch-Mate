import { UserBalanceTable } from "@/components/dashboard/user-balance-table"
import { TopNavbar } from "@/components/dashboard/top-navbar"
import { ExportButton } from "@/components/dashboard/export-button"
import { getUserBalances, getCurrentUser } from "@/lib/actions"
import { getUserOrg } from "@/lib/org-actions"

export const dynamic = "force-dynamic"

export default async function BalancesPage() {
  const [balances, org, user] = await Promise.all([
    getUserBalances(),
    getUserOrg(),
    getCurrentUser()
  ])

  return (
    <div className="flex flex-col h-full bg-background/50">
      <TopNavbar title="Team Balances" />
      <div className="flex-1 p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 overflow-auto">
        <div className="flex justify-end">
          <ExportButton />
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <UserBalanceTable 
            balances={balances} 
            currency={org?.currency || "₹"} 
            currentUserId={user?.id} 
          />
        </div>
        
        {/* Helper Card for Balance Interpretation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-md">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-2">Credit Status</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Users in <span className="text-emerald-500 font-bold">Green</span> have paid more than their total share of expenses. They are currently in surplus.
            </p>
          </div>
          <div className="p-6 rounded-[2rem] bg-red-500/5 border border-red-500/10 backdrop-blur-md">
            <h3 className="text-sm font-black uppercase tracking-widest text-red-500 mb-2">Debt Status</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Users in <span className="text-red-500 font-bold">Red</span> have a total share exceeding their payments. They owe the surplus to the group.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
