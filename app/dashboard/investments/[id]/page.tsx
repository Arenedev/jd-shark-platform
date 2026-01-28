"use client"

import React from "react"

import { useState, useEffect, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import BackButton from "@/components/back-button"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { useUserProfile } from "@/hooks/use-user-profile"
import DashboardLayout from "@/components/dashboard/layout"

function InvestmentPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if this is the "new" route
  const isNewInvestment = params.id === "new"

  if (isNewInvestment) {
    return <NewInvestmentContent searchParams={searchParams} router={router} />
  }

  return <InvestmentDetailsContent params={params} router={router} />
}

function NewInvestmentContent({ searchParams, router }: any) {
  const portfolioIdFromUrl = searchParams.get("portfolio_id")
  
  const [userId, setUserId] = useState<string | null>(null)
  const { profile } = useUserProfile(userId)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [formData, setFormData] = useState({
    amount: "",
    lock_type: "1_year" as "1_year",
    portfolio_id: portfolioIdFromUrl || "",
  })

  // Get authenticated user ID first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log("[v0] New investment: No user, redirecting to login")
          router.push("/auth/login")
          return
        }

        console.log("[v0] New investment: User authenticated:", user.id)
        setUserId(user.id)

        // Get wallet balance
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single()

        if (walletError) {
          console.error("[v0] New investment: Wallet fetch error:", walletError)
        } else {
          setWalletBalance(walletData?.balance || 0)
        }

        // Get portfolios - use current_owner_id instead of user_id
        const { data: portfoliosData, error: portfoliosError } = await supabase
          .from("portfolios")
          .select("*")
          .eq("current_owner_id", user.id)

        if (portfoliosError) {
          console.error("[v0] New investment: Portfolios fetch error:", portfoliosError)
        } else {
          console.log("[v0] New investment: Portfolios loaded:", portfoliosData?.length)
          setPortfolios(portfoliosData || [])
        }
        setLoading(false)
      } catch (err) {
        console.error("[v0] New investment auth error:", err)
        setLoading(false)
        router.push("/auth/login")
      }
    }

    checkAuth()
  }, [router])

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateInvestment = () => {
    if (!formData.amount) {
      setError("Please enter an investment amount")
      return false
    }

    const amount = Number.parseFloat(formData.amount)

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount")
      return false
    }

    const MIN_INVESTMENT = 1000
    const MAX_INVESTMENT = 50000000

    if (amount < MIN_INVESTMENT) {
      setError(`Minimum investment amount is ₦${MIN_INVESTMENT.toLocaleString()}`)
      return false
    }

    if (amount > MAX_INVESTMENT) {
      setError(`Maximum investment amount is ₦${MAX_INVESTMENT.toLocaleString()}`)
      return false
    }

    if (amount > walletBalance) {
      setError(`Insufficient wallet balance. Available: ₦${walletBalance.toLocaleString()}`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateInvestment()) {
      return
    }

    if (!userId) {
      setError("User not authenticated")
      return
    }

    setSubmitting(true)

    try {
      const amount = Number.parseFloat(formData.amount)
      const supabase = createClient()

      console.log("[v0] Creating investment for user:", userId, "amount:", amount, "lock_type:", formData.lock_type)

      // Create investment directly
      const { data: investment, error: investmentError } = await supabase
        .from("investments")
        .insert({
          user_id: userId,
          principal: amount,
          lock_type: "1_year",
          base_roi: 10.0,
          effective_roi: 15.0,
          lcr_bonus: 5.0,
          status: "approved",
          total_returns: 0,
          approved_at: new Date().toISOString(),
          returns_start_at: new Date().toISOString(),
        })
        .select()

      console.log("[v0] Investment insert response - data:", investment, "error:", investmentError)

      if (investmentError) {
        console.error("[v0] Investment creation error:", investmentError)
        throw investmentError
      }

      if (!investment || investment.length === 0) {
        console.error("[v0] Investment creation returned no data")
        throw new Error("Investment was not created. Please try again.")
      }

      const createdInvestment = investment[0]
      console.log("[v0] Investment created successfully:", createdInvestment)

      // Deduct amount from wallet
      const { error: walletUpdateError } = await supabase
        .from("wallets")
        .update({ balance: walletBalance - amount })
        .eq("user_id", userId)

      if (walletUpdateError) {
        console.error("[v0] Wallet update error:", walletUpdateError)
      } else {
        console.log("[v0] Wallet updated successfully")
      }

      setSuccess("Investment created successfully! You will start earning monthly returns.")
      setFormData({ amount: "", lock_type: "1_year", portfolio_id: "" })

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard/investments")
      }, 2000)
    } catch (err) {
      console.error("[v0] Error creating investment:", err)
      setError(err instanceof Error ? err.message : "Failed to create investment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout profile={profile}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Investment</h1>
          <p className="text-muted-foreground">Start your investment journey with a new portfolio</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Investment Details</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <span className="font-semibold">Available Balance:</span> ₦{walletBalance.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Investment Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="Enter amount (minimum: ₦1,000)"
                  value={formData.amount}
                  onChange={handleChange}
                  min="1000"
                  step="1000"
                  disabled={submitting}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">Min: ₦1,000 | Max: ₦50,000,000</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lock_type">Lock Type</Label>
                <select
                  id="lock_type"
                  name="lock_type"
                  value={formData.lock_type}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
                >
                  <option value="1_year">1 Year Lock (15% ROI/month)</option>
                </select>
                <p className="text-xs text-muted-foreground">Lock your investment for 1 year to earn monthly returns</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  <span className="font-semibold">Note:</span> Your investment will be activated immediately. You will start earning monthly returns on your investment.
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90">
                  {submitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating Investment...
                    </>
                  ) : (
                    "Create Investment"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function InvestmentDetailsContent({ params, router }: any) {
  const [investment, setInvestment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInvestment = async () => {
      try {
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
        <p className="text-muted-foreground">Investment ID: {params.id.slice(0, 8)}...</p>
      </div>

      {/* Investment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Principal Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{investment ? formatCurrency(Number(investment.principal)) : "Loading..."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Effective ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{investment ? investment.effective_roi + "%/month" : "Loading..."}</p>
            {investment && investment.lcr_bonus > 0 && (
              <p className="text-xs text-green-600">+{investment.lcr_bonus}% LCR bonus</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{investment ? formatCurrency(Number(investment.total_returns || 0)) : "Loading..."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Lock Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{investment ? getLockTypeLabel(investment.lock_type) : "Loading..."}</Badge>
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
              <p className="text-lg font-semibold">{investment ? new Date(investment.created_at).toLocaleDateString() : "Loading..."}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Approval Date</p>
              <p className="text-lg font-semibold">
                {investment ? (investment.approved_at ? new Date(investment.approved_at).toLocaleDateString() : "Pending") : "Loading..."}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Returns Start</p>
              <p className="text-lg font-semibold">{investment ? new Date(investment.returns_start_at).toLocaleDateString() : "Loading..."}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Next Return Date</p>
              <p className="text-lg font-semibold">
                {investment ? (investment.next_return_date ? new Date(investment.next_return_date).toLocaleDateString() : "Pending") : "Loading..."}
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
            <Badge className="capitalize">{investment ? investment.status : "Loading..."}</Badge>
          </div>
          {investment && new Date(investment.returns_start_at) > new Date() && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
              Returns will start accruing on {new Date(investment.returns_start_at).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvestmentPage() {
  return (
    <Suspense fallback={null}>
      <InvestmentPageContent />
    </Suspense>
  )
}
