"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { useUserProfile } from "@/hooks/use-user-profile"
import { usePortfolios } from "@/hooks/use-portfolios"
import { useWallet } from "@/hooks/use-wallet"
import { createInvestment } from "@/lib/api/investments"
import { updateWalletBalance } from "@/lib/api/wallet"

export default function NewInvestmentPage() {
  const router = useRouter()
  const { profile } = useUserProfile()
  const { portfolios, loading: portfoliosLoading } = usePortfolios()
  const { wallet, loading: walletLoading } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    portfolio_id: "",
    amount: "",
    start_date: new Date().toISOString().split("T")[0],
    auto_reinvest: false,
  })

  const handleChange = (e: any) => {
    const { name, value, checked, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const validateInvestment = () => {
    if (!formData.amount || !formData.portfolio_id) {
      setError("Please fill in all required fields")
      return false
    }

    const amount = Number.parseFloat(formData.amount)

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

    if (amount > (wallet?.balance || 0)) {
      setError(`Insufficient wallet balance. Available: ₦${(wallet?.balance || 0).toLocaleString()}`)
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

    setLoading(true)

    try {
      const amount = Number.parseFloat(formData.amount)
      const startDate = new Date(formData.start_date)
      const maturityDate = new Date(startDate)
      maturityDate.setFullYear(maturityDate.getFullYear() + 1)

      await createInvestment({
        portfolio_id: formData.portfolio_id,
        amount,
        start_date: formData.start_date,
        maturity_date: maturityDate.toISOString().split("T")[0],
        roi_percentage: 100,
        auto_reinvest: formData.auto_reinvest,
      })

      if (wallet) {
        await updateWalletBalance(wallet.id, wallet.balance - amount)
      }

      setSuccess("Investment created successfully!")

      setTimeout(() => {
        router.push("/dashboard/investments")
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create investment")
    } finally {
      setLoading(false)
    }
  }

  if (portfoliosLoading || walletLoading) {
    return (
      <DashboardLayout profile={profile}>
        <div className="flex items-center justify-center h-64">
          <Spinner className="w-8 h-8" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create Investment</h1>
          <p className="text-muted-foreground">Start a new investment plan with guaranteed 100% returns</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="portfolio_id">Select Portfolio</Label>
                <select
                  id="portfolio_id"
                  name="portfolio_id"
                  value={formData.portfolio_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Choose a portfolio...</option>
                  {portfolios.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Balance: ₦{Number(p.total_balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="amount">Investment Amount (₦)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="50000"
                  value={formData.amount}
                  onChange={handleChange}
                  min="1000"
                  step="1000"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum: ₦1,000 | Maximum: ₦50,000,000 | Available: ₦{(wallet?.balance || 0).toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Returns:</strong> Your investment will mature in 1 year with 100% ROI. You'll earn{" "}
                  <strong>₦{formData.amount ? Number.parseFloat(formData.amount).toLocaleString() : "0"}</strong> in
                  returns.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="auto_reinvest"
                  checked={formData.auto_reinvest}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-foreground">Auto-reinvest returns when investment matures</span>
              </label>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                  {loading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating...
                    </>
                  ) : (
                    "Create Investment"
                  )}
                </Button>
                <Button variant="outline" onClick={() => router.back()} className="flex-1 bg-transparent">
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
