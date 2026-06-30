import { redirect } from "next/navigation"
import { getAuthorizedOrgId } from "@/lib/org-actions"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuthorizedOrgId()
  if (!auth || auth.role !== "admin") {
    redirect("/user")
  }

  return <>{children}</>
}
