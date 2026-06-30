"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-6">
      <div className="p-4 rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black uppercase tracking-tight">Something Went Wrong</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          We hit an unexpected error loading this page. You can try again, or head back if the problem continues.
        </p>
      </div>
      <Button
        onClick={reset}
        className="gap-2 h-12 px-6 rounded-xl font-black uppercase tracking-widest text-xs border-2 border-primary/20 hover:border-primary/50 shadow-none"
      >
        <RotateCcw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  )
}
