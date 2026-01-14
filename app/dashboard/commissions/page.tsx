"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getUserCommissions,
  getCommissionSummary,
  type Commission,
  type CommissionSummary,
} from "@/lib/api/commissions"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from "lucide-react"

export default function CommissionsPage() {
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [summary, setSummary] = useState<CommissionSummary | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = "/auth/login"
        return
      }

      setUserId(user.id)

      try {
        const [commissionsData, summaryData] = await Promise.all([
          getUserCommissions(user.id),
          getCommissionSummary(user.id),
        ])

        setCommissions(commissionsData)
        setSummary(summaryData)
      } catch (error) {
        console.error("[v0] Error loading commissions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Network Commissions</h1>
        <p className="text-muted-foreground">Track your earnings from network activity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalEarned || 0)}</div>
            <p className="text-xs text-muted-foreground">All-time commission earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credited</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.creditedCommissions || 0)}</div>
            <p className="text-xs text-muted-foreground">Available in your balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.pendingCommissions || 0)}</div>
            <p className="text-xs text-muted-foreground">Awaiting monthly crediting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Count</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissions.length}</div>
            <p className="text-xs text-muted-foreground">Total commission records</p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions by Type */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Type</CardTitle>
            <CardDescription>Breakdown of commission sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.byType).map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commissions</CardTitle>
          <CardDescription>Your latest commission earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No commissions yet</p>
          ) : (
            <div className="space-y-4">
              {commissions.slice(0, 20).map((commission) => (
                <div key={commission.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={commission.status === "credited" ? "default" : "secondary"}>
                        {commission.status}
                      </Badge>
                      <span className="text-sm capitalize">{commission.commission_type.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gen {commission.generation} • {commission.calculation_period} • {commission.percentage_rate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(commission.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
