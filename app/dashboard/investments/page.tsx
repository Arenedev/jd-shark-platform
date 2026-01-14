"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useUserProfile } from "@/hooks/use-user-profile"
import { getUserInvestments, type Investment } from "@/lib/api/investments-phase1"
import { Loader2 } from "lucide-react"

export default function InvestmentsPage() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInvestments() {
      if (!profile?.id) return

      try {
        console.log("[v0] Loading investments for user:", profile.id)
        const data = await getUserInvestments(profile.id)
        console.log("[v0] Investments loaded:", data.length)
        setInvestments(data)
      } catch (err) {
        console.error("[v0] Error loading investments:", err)
        setError("Failed to load investments")
      } finally {
        setLoading(false)
      }
    }

    if (profile?.id) {
      loadInvestments()
    }
  }, [profile?.id])

  if (profileLoading || loading) {
    return (
      <DashboardLayout profile={profile}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading investments...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout profile={profile}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getLockTypeLabel = (lockType: string) => {
    switch (lockType) {
      case "1_year":
        return "1 Year LCR"
      case "10_year":
        return "10 Year LCR"
      default:
        return "No Lock"
    }
  }

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.principal || 0), 0)
  const totalReturns = investments.reduce((sum, inv) => sum + Number(inv.total_returns || 0), 0)
  const activeCount = investments.filter((inv) => inv.status === "active").length

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Investments</h1>
            <p className="text-muted-foreground">Track your investments and monthly returns</p>
          </div>
        </div>

        {/* Investment Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReturns)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Investments List */}
        {investments && investments.length > 0 ? (
          <div className="space-y-4">
            {investments.map((investment) => (
              <Card key={investment.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Investment #{investment.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Approved on {new Date(investment.approved_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="capitalize bg-primary/10 text-primary hover:bg-primary/10">
                        {investment.status}
                      </Badge>
                      <Badge variant="outline">{getLockTypeLabel(investment.lock_type)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Principal</p>
                      <p className="text-lg font-semibold">{formatCurrency(Number(investment.principal))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Effective ROI</p>
                      <p className="text-lg font-semibold">{investment.effective_roi}%/month</p>
                      {investment.lcr_bonus > 0 && (
                        <p className="text-xs text-green-600">+{investment.lcr_bonus}% LCR bonus</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Returns</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(Number(investment.total_returns || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Returns Start</p>
                      <p className="text-lg font-semibold">
                        {new Date(investment.returns_start_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Next Return</p>
                      <p className="text-lg font-semibold">
                        {investment.next_return_date
                          ? new Date(investment.next_return_date).toLocaleDateString()
                          : "Pending"}
                      </p>
                    </div>
                  </div>

                  {new Date(investment.returns_start_at) > new Date() && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                      Returns will start accruing on {new Date(investment.returns_start_at).toLocaleDateString()} (4
                      months after approval)
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No investments yet</p>
              <p className="text-sm text-muted-foreground mb-6">Make a deposit to create your first investment</p>
              <Link href="/dashboard/wallet-funding">
                <Button className="bg-primary hover:bg-primary/90">Make a Deposit</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
