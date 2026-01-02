"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockInvestments, mockPortfolios } from "@/lib/mock-data"
import BackButton from "@/components/back-button"

export default function InvestmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [investment, setInvestment] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<any>(null)

  useEffect(() => {
    if (params.id === "new") {
      router.push("/dashboard/investments/new")
      return
    }

    const foundInvestment = mockInvestments.find((i) => i.id === params.id)
    if (foundInvestment) {
      setInvestment(foundInvestment)
      const foundPortfolio = mockPortfolios.find((p) => p.id === foundInvestment.portfolio_id)
      setPortfolio(foundPortfolio)
    }
  }, [params.id, router])

  if (!investment) {
    return <div className="text-center py-12 text-muted-foreground">Investment not found</div>
  }

  const projectedReturn = investment.amount * (investment.roi_percentage / 100)
  const totalMaturity = investment.amount + projectedReturn
  const daysRemaining = Math.ceil(
    (new Date(investment.maturity_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <BackButton />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Investment Details</h1>
        <p className="text-muted-foreground">Portfolio: {portfolio?.name}</p>
      </div>

      {/* Investment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Initial Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₦{investment.amount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">ROI Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{investment.roi_percentage}%</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Projected Return</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">₦{projectedReturn.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total at Maturity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₦{totalMaturity.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="hover:border-accent/50 transition-colors">
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Start Date</p>
            <p className="text-lg font-semibold text-foreground">
              {new Date(investment.start_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Maturity Date</p>
            <p className="text-lg font-semibold text-foreground">
              {new Date(investment.maturity_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
            <p className="text-lg font-semibold text-secondary">{daysRemaining > 0 ? daysRemaining : "Matured"} days</p>
          </div>
        </CardContent>
      </Card>

      {/* Investment Status */}
      <Card className="hover:border-accent/50 transition-colors">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-foreground">Investment Status</span>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded ${
                investment.status === "active"
                  ? "bg-green-100 text-green-800"
                  : investment.status === "matured"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {investment.status}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input type="checkbox" disabled checked={investment.auto_reinvest} />
            <span className="text-foreground">Auto-reinvest enabled</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
