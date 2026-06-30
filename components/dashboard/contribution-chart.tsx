"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ContributionChartProps {
  data: { name: string; paid: number; shares: number }[]
  currency?: string
}

export function ContributionChart({ data, currency }: ContributionChartProps) {
  const hasData = data.some((d) => d.paid > 0 || d.shares > 0)

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pt-8 px-8 pb-4">
        <CardTitle className="text-lg font-black tracking-tight uppercase">Contribution Analysis</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-12">
        {!hasData ? (
          <div className="h-80 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-3 rounded-full bg-primary/5">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">No contributions yet</p>
          </div>
        ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={8}>
              <defs>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${currency || ""}${value}`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(18, 24, 33, 0.8)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
                  padding: "12px",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.7)", fontWeight: "bold", marginBottom: "4px", fontSize: "12px", textTransform: "uppercase" }}
                formatter={(value: number) => [`${currency || ""}${value || 0}`, ""]}
                labelFormatter={(label) => label || "Unknown User"}
                cursor={{ fill: "rgba(255, 255, 255, 0.05)", radius: 10 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="circle"
                iconSize={10}
              />
              <Bar
                dataKey="paid"
                name="Total Paid"
                fill="url(#colorPaid)"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="shares"
                name="Total Shares"
                fill="url(#colorShares)"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
