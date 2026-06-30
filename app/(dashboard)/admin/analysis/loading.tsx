import { TableSkeleton } from "@/components/dashboard/skeletons"

export default function AdminAnalysisLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-16 border-b px-4 lg:px-6">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        <TableSkeleton rows={10} />
      </div>
    </div>
  )
}
