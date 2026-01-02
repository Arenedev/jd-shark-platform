"use client"

import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUserProfile } from "@/hooks/use-user-profile"
import { usePortfolios } from "@/hooks/use-portfolios"
import { useInvestments } from "@/hooks/use-investments"

export default function PortfoliosPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile()
  const { portfolios, loading: portfoliosLoading } = usePortfolios()
  const { investments } = useInvestments()

  if (profileLoading || portfoliosLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const getPortfolioInvestments = (portfolioId: string) => {
    return investments.filter((i: any) => i.portfolio_id === portfolioId)
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portfolios</h1>
            <p className="text-muted-foreground">Manage your investment portfolios</p>
          </div>
          <Link href="/dashboard/portfolios/new">
            <Button className="bg-primary hover:bg-primary/90">Create Portfolio</Button>
          </Link>
        </div>

        {portfolios && portfolios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portfolios.map((portfolio: any) => {
              const portfolioInvestments = getPortfolioInvestments(portfolio.id)
              const totalBalance = Number(portfolio.total_balance) || 0

              return (
                <Card key={portfolio.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{portfolio.name}</CardTitle>
                        <CardDescription className="capitalize">{portfolio.portfolio_type}</CardDescription>
                      </div>
                      <span className="text-2xl">📁</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-2xl font-bold text-primary">₦{totalBalance.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Active Investments</p>
                        <p className="text-lg font-semibold">
                          {portfolioInvestments.filter((i: any) => i.status === "active").length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Matured</p>
                        <p className="text-lg font-semibold">
                          {portfolioInvestments.filter((i: any) => i.status === "matured").length}
                        </p>
                      </div>
                    </div>
                    <Link href={`/dashboard/portfolios/${portfolio.id}`}>
                      <Button variant="outline" className="w-full bg-transparent">
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No portfolios yet</p>
              <Link href="/dashboard/portfolios/new">
                <Button className="bg-primary hover:bg-primary/90">Create Your First Portfolio</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
