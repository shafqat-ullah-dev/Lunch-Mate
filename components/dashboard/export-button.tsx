"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportBalancesCsv, exportEntriesCsv } from "@/lib/export-actions"

function downloadCsv(csv: string, filename: string) {
  // Prepend a UTF-8 BOM so Excel renders currency symbols (₹ etc.) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ExportButton() {
  const [loading, setLoading] = useState(false)

  async function run(
    kind: "balances" | "entries",
    action: () => Promise<{ success: boolean; csv?: string; error?: string }>
  ) {
    setLoading(true)
    try {
      const res = await action()
      if (!res.success || !res.csv) {
        toast.error(res.error || "Export failed")
        return
      }
      const date = new Date().toISOString().split("T")[0]
      downloadCsv(res.csv, `lunch-mate-${kind}-${date}.csv`)
      toast.success("Export downloaded")
    } catch {
      toast.error("Export failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("balances", exportBalancesCsv)}>
          Balance summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("entries", exportEntriesCsv)}>
          All entries (detailed)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
