"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { mockPortfolios, mockInvestments } from "@/lib/mock-data"
import BackButton from "@/components/back-button"

export default function PortfolioDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<any>(null)
  const [investments, setInvestments] = useState<any[]>([])

  useEffect(() => {
    if (params.id === "new") {
      router.push("/dashboard/portfolios/new")
      return
    }

    const foundPortfolio = mockPortfolios.find((p) => p.id === params.id)
    if (foundPortfolio) {
      setPortfolio(foundPortfolio)
      const relatedInvestments = mockInvestments.filter((i) => i.portfolio_id === params.id)
      setInvestments(relatedInvestments)
    }
  }, [params.id, router])

  if (!portfolio) {
    return <div className="text-center py-12 text-muted-foreground">Portfolio not found</div>
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
  const totalReturns = investments.reduce((sum, inv) => sum + inv.amount * (inv.roi_percentage / 100), 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <BackButton />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{portfolio.name}</h1>
        <p className="text-muted-foreground">{portfolio.purpose}</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">₦{portfolio.total_balance.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₦{totalInvested.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Projected Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">₦{totalReturns.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Investments in this Portfolio */}
      <Card className="hover:border-accent/50 transition-colors">
        <CardHeader>
          <CardTitle>Investments</CardTitle>
          <CardDescription>All investments in this portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {investments.length > 0 ? (
            <div className="space-y-4">
              {investments.map((inv) => (
                <div
                  key={inv.id}
                  className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">Amount: ₦{inv.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">ROI: {inv.roi_percentage}%</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded ${
                        inv.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.start_date).toLocaleDateString()} - {new Date(inv.maturity_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No investments in this portfolio yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
