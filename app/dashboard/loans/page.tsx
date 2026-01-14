"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"
import { checkLoanEligibility, getUserLoans, type OrganizationLoan } from "@/lib/api/special-features"

export default function LoansPage() {
  const [loans, setLoans] = useState<OrganizationLoan[]>([])
  const [eligibility, setEligibility] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const [eligibilityData, loansData] = await Promise.all([checkLoanEligibility(user.id), getUserLoans(user.id)])

      setEligibility(eligibilityData)
      setLoans(loansData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestLoan() {
    setRequesting(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/loans/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number.parseFloat(amount) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to request loan")
      }

      setSuccess("Loan request submitted successfully!")
      setAmount("")
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (!eligibility?.eligible) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-3xl font-bold">Organization Loans</h1>
        <Alert>
          <AlertDescription>
            Loans are only available for Organization accounts. Please upgrade your account type to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Organization Loans</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Eligibility</CardTitle>
            <CardDescription>Based on your investment portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-2xl font-bold">{formatCurrency(eligibility.investment_portfolio_value)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Maximum Loan Amount (80%)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(eligibility.max_loan_amount)}</p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Interest Rate</p>
              <p className="text-xl font-semibold">0.5% per month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request New Loan</CardTitle>
            <CardDescription>Submit a loan request for admin approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Loan Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={eligibility.max_loan_amount}
              />
              <p className="text-xs text-muted-foreground">Maximum: {formatCurrency(eligibility.max_loan_amount)}</p>
            </div>

            <Button onClick={handleRequestLoan} disabled={!amount || requesting} className="w-full">
              {requesting ? "Submitting..." : "Request Loan"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Loans</CardTitle>
          <CardDescription>View all your loan requests and active loans</CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No loans yet. Request your first loan above.</p>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div key={loan.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{formatCurrency(loan.principal_amount)}</p>
                      <p className="text-sm text-muted-foreground">Total Due: {formatCurrency(loan.total_due)}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        loan.status === "active"
                          ? "bg-green-100 text-green-800"
                          : loan.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : loan.status === "paid"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {loan.status.toUpperCase()}
                    </span>
                  </div>

                  {loan.status === "active" && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <span className="font-medium">{formatCurrency(loan.amount_paid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-medium">{formatCurrency(loan.total_due - loan.amount_paid)}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(loan.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
