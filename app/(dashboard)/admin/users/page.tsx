import { TopNavbar } from "@/components/dashboard/top-navbar"
import { UserManagement } from "@/components/dashboard/user-management"
import { getUsers, getUserBalances, getCurrentUser } from "@/lib/actions"
import { getOrgMemberRoles, getOrgOwnerId } from "@/lib/org-actions"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const [users, balances, user, memberRoles, ownerId] = await Promise.all([
    getUsers(),
    getUserBalances(),
    getCurrentUser(),
    getOrgMemberRoles(),
    getOrgOwnerId(),
  ])

  return (
    <div className="flex flex-col h-full">
      <TopNavbar title="Member Tracking" />
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        <UserManagement
          users={users}
          balances={balances}
          currentUserId={user?.id}
          memberRoles={memberRoles}
          ownerId={ownerId}
        />
      </div>
    </div>
  )
}
