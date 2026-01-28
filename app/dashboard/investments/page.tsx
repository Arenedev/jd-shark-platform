"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { getUserInvestments, type Investment } from "@/lib/api/investments-phase1"
import { Loader2, Wallet, FolderOpen } from "lucide-react"

export default function InvestmentsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)

  // Get authenticated user ID first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log("[v0] Investments page: No user, redirecting to login")
          router.push("/auth/login")
          return
        }

        console.log("[v0] Investments page: User authenticated:", user.id)
        setUserId(user.id)
      } catch (err) {
        console.error("[v0] Investments page: Auth check error:", err)
        router.push("/auth/login")
      }
    }

    checkAuth()
  }, [router])

  // Load investments, portfolios, and wallet when userId is available
  useEffect(() => {
    async function loadData() {
      if (!userId) {
        console.log("[v0] Investments page: No userId yet, skipping load")
        return
      }

      try {
        console.log("[v0] Investments page: Loading data for user:", userId)
        const supabase = createClient()

        // Load investments
        const investmentsData = await getUserInvestments(userId)
        console.log("[v0] Investments page: Investments loaded:", investmentsData.length)
        setInvestments(investmentsData)

        // Load portfolios
        const { data: portfoliosData } = await supabase
          .from("portfolios")
          .select("*")
          .eq("current_owner_id", userId)

        console.log("[v0] Investments page: Portfolios loaded:", portfoliosData?.length || 0)
        setPortfolios(portfoliosData || [])

        // Load wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .single()

        if (wallet) {
          setWalletBalance(wallet.balance || 0)
        }

        setLoading(false)
      } catch (err) {
        console.error("[v0] Investments page: Error loading data:", err)
        setError("Failed to load investments")
        setLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId])

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

  if (loading) {
    return (
      <DashboardLayout profile={profile}>
        <div className="flex items-center justify-center min-h-screen">
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

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.principal || 0), 0)
  const totalReturns = investments.reduce((sum, inv) => sum + Number(inv.total_returns || 0), 0)
  const activeCount = investments.filter((inv) => inv.status === "active").length

  // Check if user should see "Make Deposit" button
  const shouldShowMakeDeposit = investments.length === 0 && walletBalance === 0

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Investments</h1>
            <p className="text-muted-foreground">Track your investments and monthly returns</p>
          </div>
        </div>

        {/* Wallet Balance */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(walletBalance)}</p>
              </div>
              <Link href="/dashboard/wallet-funding">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Wallet className="h-4 w-4" />
                  Add Funds
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

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

        {/* Portfolios Section */}
        {portfolios && portfolios.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Your Portfolios
              </h2>
              <Link href="/dashboard/portfolios/new">
                <Button size="sm" variant="outline">
                  New Portfolio
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolios.map((portfolio) => {
                const portfolioInvestments = investments.filter(
                  (inv) => (inv as any).portfolio_id === portfolio.id
                )
                return (
                  <Card
                    key={portfolio.id}
                    className="hover:border-primary/50 transition-colors"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">{portfolio.portfolio_type}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Investments</p>
                          <p className="text-lg font-semibold">{portfolioInvestments.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Portfolio Balance</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(Number(portfolio.total_balance || 0))}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/dashboard/portfolios/${portfolio.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full bg-transparent">
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/dashboard/investments/new?portfolio_id=${portfolio.id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                            Invest Now
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6 text-center">
              <FolderOpen className="h-12 w-12 text-blue-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Portfolios Yet</h3>
              <p className="text-muted-foreground mb-6">Create a portfolio to start your investment journey</p>
              <Link href="/dashboard/portfolios/new">
                <Button className="bg-primary hover:bg-primary/90">Create Your First Portfolio</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Investments Section */}
        {investments && investments.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Your Investments</h2>

            <div className="space-y-4">
              {investments.map((investment) => (
                <Card key={investment.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link href={`/dashboard/investments/${investment.id}`} className="hover:underline">
                          <h3 className="text-lg font-semibold text-foreground cursor-pointer">
                            Investment #{investment.id.slice(0, 8)}
                          </h3>
                        </Link>
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
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No investments yet</p>
              {walletBalance > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-6">
                    You have ₦{walletBalance.toLocaleString()} available. Create your first investment now!
                  </p>
                  <Link href="/dashboard/investments/new">
                    <Button className="bg-primary hover:bg-primary/90">Create Investment</Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">Make a deposit to create your first investment</p>
                  <Link href="/dashboard/wallet-funding">
                    <Button className="bg-primary hover:bg-primary/90">Make a Deposit</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
