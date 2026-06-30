"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, CheckCircle, ClipboardList } from "lucide-react"

interface AuditEntry {
  id: string
  date: string
  totalExpense: number
  totalShares: number
  totalPayments: number
  issues: string[]
}

interface DataAuditTableProps {
  entries: AuditEntry[]
  currency?: string
}

export function DataAuditTable({ entries, currency }: DataAuditTableProps) {
  return (
    <Card className="border-2 border-border/40 bg-card/40 backdrop-blur-2xl shadow-none rounded-[2rem] overflow-hidden">
      <CardHeader className="pb-4 pt-8 px-6 md:px-10 flex flex-row items-center justify-between">
        <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Data Audit</CardTitle>
        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest h-6">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </Badge>
      </CardHeader>
      <CardContent className="px-0 pb-8">
        <TooltipProvider>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5 border-none h-14">
                  <TableHead className="text-center font-black text-primary uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="text-center font-black text-primary uppercase text-[10px] tracking-widest">Total Expense</TableHead>
                  <TableHead className="text-center font-black text-primary uppercase text-[10px] tracking-widest">Total Shares</TableHead>
                  <TableHead className="text-center font-black text-primary uppercase text-[10px] tracking-widest">Total Paid</TableHead>
                  <TableHead className="text-center font-black text-primary uppercase text-[10px] tracking-widest">Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const hasIssues = entry.issues.length > 0
                  const issuesText = entry.issues.join(", ")
                  return (
                    <TableRow
                      key={entry.id}
                      className={cn("border-b border-border/30 last:border-none", hasIssues && "bg-destructive/5")}
                    >
                      <TableCell className="text-center font-medium text-sm">
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center tabular-nums text-sm font-bold",
                          entry.totalExpense === 0 && "text-red-500"
                        )}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {entry.totalExpense === 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                          {currency} {entry.totalExpense.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm font-medium">
                        {currency} {entry.totalShares.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center tabular-nums text-sm font-bold",
                          entry.totalPayments === 0 &&
                            entry.totalExpense > 0 &&
                            "text-red-500"
                        )}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {entry.totalPayments === 0 && entry.totalExpense > 0 && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {currency} {entry.totalPayments.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center max-w-[220px]">
                        {hasIssues ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-2 cursor-default">
                                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                <span className="text-sm text-red-500 truncate">
                                  {issuesText}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {issuesText}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm text-muted-foreground">
                              No issues
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-3 rounded-full bg-primary/5">
                          <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">No entries to audit</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
