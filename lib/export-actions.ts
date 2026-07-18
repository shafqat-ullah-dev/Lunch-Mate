"use server"

import { getAuthorizedOrgId } from "./org-actions"
import { getUserBalances, getEntriesWithDetails } from "./actions"

// Quote a value for CSV: wrap in quotes and escape embedded quotes.
function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
}

// Export the current org's balance summary as CSV (admins only).
export async function exportBalancesCsv(): Promise<{ success: boolean; csv?: string; error?: string }> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return { success: false, error: "No organization found" }
  if (auth.role !== "admin") return { success: false, error: "Only admins can export data" }

  const balances = await getUserBalances()
  const rows: (string | number | null | undefined)[][] = [
    ["Name", "Days Present", "Total Paid", "Total Shares", "Balance"],
    ...balances.map((b) => [b.name, b.daysPresent, b.totalPaid ?? 0, b.totalShares ?? 0, b.balance ?? 0]),
  ]
  return { success: true, csv: toCsv(rows) }
}

// Export every lunch entry with per-person share/paid breakdown (admins only).
export async function exportEntriesCsv(): Promise<{ success: boolean; csv?: string; error?: string }> {
  const auth = await getAuthorizedOrgId()
  if (!auth) return { success: false, error: "No organization found" }
  if (auth.role !== "admin") return { success: false, error: "Only admins can export data" }

  const entries = await getEntriesWithDetails()
  const rows: (string | number | null | undefined)[][] = [
    ["Date", "Person", "Share", "Paid", "Entry Total", "Notes"],
  ]
  for (const entry of entries) {
    const names = new Set<string>([
      ...entry.shares.map((s) => s.user_name),
      ...entry.payments.map((p) => p.user_name),
    ])
    for (const name of names) {
      const share = entry.shares.find((s) => s.user_name === name)?.share_amount ?? 0
      const paid = entry.payments.find((p) => p.user_name === name)?.paid_amount ?? 0
      rows.push([entry.date, name, share, paid, entry.total_expense, entry.notes ?? ""])
    }
  }
  return { success: true, csv: toCsv(rows) }
}
