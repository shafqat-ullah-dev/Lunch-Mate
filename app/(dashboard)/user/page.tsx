"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { TopNavbar } from "@/components/dashboard/top-navbar"
import { UserDashboard } from "@/components/dashboard/user-dashboard"
import { UserDashboardSkeleton } from "@/components/dashboard/skeletons"
import { Button } from "@/components/ui/button"
import {
  getUsers, 
  getUserBalances, 
  getEntriesWithDetails, 
  getWeeklySummary, 
  getMonthlySummary,
  getCurrentUser
} from "@/lib/actions"
import { getUserOrg } from "@/lib/org-actions"

async function fetchData() {
  const [users, balances, entries, weeklyData, monthlyData, org, user] = await Promise.all([
    getUsers(),
    getUserBalances(),
    getEntriesWithDetails(),
    getWeeklySummary(),
    getMonthlySummary(),
    getUserOrg(),
    getCurrentUser(),
  ])
  return { users, balances, entries, weeklyData, monthlyData, org, user }
}

export default function UserPage() {
  const { data, isLoading, error, mutate } = useSWR("user-dashboard-data", fetchData, {
    revalidateOnFocus: false,
  })

  const [selectedUserId, setSelectedUserId] = useState<string>("")

  useEffect(() => {
    if (data?.users && data.users.length > 0 && !selectedUserId) {
      setSelectedUserId(data.users[0].id)
    }
  }, [data?.users, selectedUserId])

  if (error) {
    return (
      <div className="flex flex-col h-full bg-background/50">
        <TopNavbar title="My Dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="p-4 rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-black uppercase tracking-tight">Couldn't Load Dashboard</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Something went wrong fetching your data. Please try again.
            </p>
          </div>
          <Button
            onClick={() => mutate()}
            className="gap-2 h-12 px-6 rounded-xl font-black uppercase tracking-widest text-xs border-2 border-primary/20 hover:border-primary/50 shadow-none"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col h-full bg-background/50">
        <TopNavbar title="My Dashboard" />
        <div className="flex-1 p-6 lg:p-10 pb-24 overflow-auto">
          <UserDashboardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      <TopNavbar title="My Dashboard" />
      <div className="flex-1 p-6 lg:p-10 pb-24 overflow-auto">
        <UserDashboard
          users={data.users}
          balances={data.balances}
          entries={data.entries}
          weeklyData={data.weeklyData}
          monthlyData={data.monthlyData}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          currency={data.org?.currency || ""}
          currentUserId={data.user?.id}
        />
      </div>
    </div>
  )
}
