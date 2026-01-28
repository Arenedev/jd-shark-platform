"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Loader2 } from "lucide-react"

function NewInvestmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const portfolioIdFromUrl = searchParams.get("portfolio_id")
  
  const [userId, setUserId] = useState<string | null>(null)
  const { profile } = useUserProfile(userId)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [portfoliosLoading, setPortfoliosLoading] = useState(true)
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [formData, setFormData] = useState({
    amount: "",
    lock_type: "none" as "none" | "1_year" | "10_year",
    portfolio_id: portfolioIdFromUrl || "",
    start_date: "",
    auto_reinvest: false,
  })
  const [wallet, setWallet] = useState<any | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)

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
          setWallet(walletData)
          setWalletBalance(walletData?.balance || 0)
        }
        setWalletLoading(false)

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
        setPortfoliosLoading(false)
        setLoading(false)
      } catch (err) {
        console.error("[v0] New investment auth error:", err)
        setWalletLoading(false)
        setPortfoliosLoading(false)
        setLoading(false)
        router.push("/auth/login")
      }
    }

    checkAuth()
  }, [router])

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

    if (!formData.portfolio_id) {
      setError("Please select a portfolio")
      return false
    }

    if (!formData.start_date) {
      setError("Please select a start date")
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
          lock_type: formData.lock_type,
          base_roi: 1.0,
          effective_roi: formData.lock_type === "1_year" ? 6.0 : formData.lock_type === "10_year" ? 11.0 : 1.0,
          lcr_bonus: formData.lock_type === "1_year" ? 5.0 : formData.lock_type === "10_year" ? 10.0 : 0,
          status: "pending",
          total_returns: 0,
          returns_start_at: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000).toISOString(),
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

      setSuccess("Investment created successfully! Your investment is pending admin approval.")
      setFormData({ amount: "", lock_type: "none", portfolio_id: "" })

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

  if (loading || portfoliosLoading || walletLoading) {
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
                <Label htmlFor="portfolio_id">Select Portfolio</Label>
                <select
                  id="portfolio_id"
                  name="portfolio_id"
                  value={formData.portfolio_id}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
                >
                  <option value="">Choose a portfolio...</option>
                  {portfolios.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Balance: ₦{Number(p.total_balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
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
                <p className="text-xs text-muted-foreground">
                  Min: ₦1,000 | Max: ₦50,000,000
                </p>
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
                  <option value="none">No Lock (1.0% ROI/month)</option>
                  <option value="1_year">1 Year Lock (6.0% ROI/month + 5% LCR bonus)</option>
                  <option value="10_year">10 Year Lock (11.0% ROI/month + 10% LCR bonus)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Longer lock periods provide higher returns through LCR bonuses
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Returns:</span> Your investment will mature in 1 year with 100% ROI. You'll earn{" "}
                  <span className="font-semibold">₦{formData.amount ? Number.parseFloat(formData.amount).toLocaleString() : "0"}</span> in
                  returns.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="auto_reinvest"
                  checked={formData.auto_reinvest}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-4 h-4"
                />
                <span className="text-foreground">Auto-reinvest returns when investment matures</span>
              </label>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {submitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating Investment...
                    </>
                  ) : (
                    "Create Investment"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
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

export default function NewInvestmentPage() {
  return (
    <Suspense fallback={null}>
      <NewInvestmentContent />
    </Suspense>
  )
}
