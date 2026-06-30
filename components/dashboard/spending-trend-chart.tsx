"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart as LineChartIcon } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface SpendingTrendChartProps {
  data: { date: string; expense: number }[]
  currency?: string
}

export function SpendingTrendChart({ data, currency }: SpendingTrendChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }))
  const hasData = data.some((d) => d.expense > 0)

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pt-8 px-8 pb-4">
        <CardTitle className="text-lg font-black tracking-tight uppercase">Spending Trend</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-12">
        {!hasData ? (
          <div className="h-80 flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-3 rounded-full bg-primary/5">
              <LineChartIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">No spending recorded yet</p>
          </div>
        ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <defs>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
              <XAxis
                dataKey="date"
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
                itemStyle={{ color: "var(--primary)", fontWeight: "bold", fontSize: "14px" }}
                labelStyle={{ color: "rgba(255,255,255,0.7)", marginBottom: "4px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}
                formatter={(value: number) => [`${currency || ""}${value || 0}`, "Amount Spent"]}
                cursor={{ stroke: "rgba(16, 185, 129, 0.2)", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="var(--primary)"
                strokeWidth={5}
                dot={{ fill: "var(--primary)", strokeWidth: 2, r: 5, stroke: "var(--background)" }}
                activeDot={{ r: 8, fill: "#fff", strokeWidth: 4, stroke: "var(--primary)" }}
                animationDuration={2000}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
