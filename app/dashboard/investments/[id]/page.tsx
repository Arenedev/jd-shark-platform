"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import BackButton from "@/components/back-button"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function InvestmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [investment, setInvestment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInvestment = async () => {
      try {
        if (!params.id || params.id === "new") {
          router.push("/dashboard/investments/new")
          return
        }

        console.log("[v0] Loading investment details for ID:", params.id)
        const supabase = createClient()

        const { data, error: investmentError } = await supabase
          .from("investments")
          .select("*")
          .eq("id", params.id)
          .single()

        if (investmentError) {
          console.error("[v0] Investment fetch error:", investmentError)
          throw new Error("Investment not found")
        }

        if (!data) {
          console.error("[v0] No investment data returned")
          setError("Investment not found")
          setLoading(false)
          return
        }

        console.log("[v0] Investment loaded:", data)
        setInvestment(data)
      } catch (err) {
        console.error("[v0] Error loading investment:", err)
        setError(err instanceof Error ? err.message : "Failed to load investment")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadInvestment()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading investment details...</p>
        </div>
      </div>
    )
  }

  if (error || !investment) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Investment Not Found</h2>
          <p className="text-muted-foreground">{error || "Could not load investment details"}</p>
        </div>
      </div>
    )
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Investment Details</h1>
        <p className="text-muted-foreground">Investment ID: {investment.id.slice(0, 8)}...</p>
      </div>

      {/* Investment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Principal Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(Number(investment.principal))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Effective ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{investment.effective_roi}%/month</p>
            {investment.lcr_bonus > 0 && (
              <p className="text-xs text-green-600">+{investment.lcr_bonus}% LCR bonus</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(Number(investment.total_returns || 0))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Lock Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{getLockTypeLabel(investment.lock_type)}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created Date</p>
              <p className="text-lg font-semibold">{new Date(investment.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Approval Date</p>
              <p className="text-lg font-semibold">
                {investment.approved_at ? new Date(investment.approved_at).toLocaleDateString() : "Pending"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Returns Start</p>
              <p className="text-lg font-semibold">{new Date(investment.returns_start_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Next Return Date</p>
              <p className="text-lg font-semibold">
                {investment.next_return_date ? new Date(investment.next_return_date).toLocaleDateString() : "Pending"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-foreground">Status</span>
            <Badge className="capitalize">{investment.status}</Badge>
          </div>
          {new Date(investment.returns_start_at) > new Date() && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
              Returns will start accruing on {new Date(investment.returns_start_at).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
