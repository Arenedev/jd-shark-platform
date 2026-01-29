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
import { requestLoanAction } from "@/lib/actions/loans"
import { requestLoanRepaymentAction } from "@/lib/actions/loan-repayment"

export default function LoansPage() {
  const [loans, setLoans] = useState<OrganizationLoan[]>([])
  const [eligibility, setEligibility] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [repaymentLoanId, setRepaymentLoanId] = useState<string | null>(null)
  const [repaymentAmount, setRepaymentAmount] = useState("")
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("[v0] No user found")
        return
      }

      console.log("[v0] Loading loan data for user:", user.id)
      
      const eligibilityData = await checkLoanEligibility(user.id)
      console.log("[v0] Eligibility data received in component:", eligibilityData)
      
      setEligibility(eligibilityData)
      
      const loansData = await getUserLoans(user.id)
      console.log("[v0] Loans data received:", loansData)
      
      setLoans(loansData)
    } catch (err: any) {
      console.error("[v0] Error loading data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRepaymentClick(loan: OrganizationLoan) {
    setRepaymentLoanId(loan.id)
    setRepaymentAmount(loan.total_due.toString())
    setShowRepaymentDialog(true)
  }

  async function handleSubmitRepayment() {
    if (!repaymentLoanId || !repaymentAmount) return

    setRequesting(true)
    setError("")

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Please log in to submit repayment")
      }

      const amount = Number.parseFloat(repaymentAmount)
      const loan = loans.find((l) => l.id === repaymentLoanId)

      if (!loan) {
        throw new Error("Loan not found")
      }

      if (amount < loan.total_due) {
        throw new Error(`Minimum repayment amount is ₦${loan.total_due.toLocaleString()} (total due with interest)`)
      }

      await requestLoanRepaymentAction(repaymentLoanId, user.id, loan.principal_amount, loan.total_due - loan.principal_amount)

      setSuccess("Repayment request submitted! Please transfer ₦" + amount.toLocaleString() + " to the provided account details.")
      setShowRepaymentDialog(false)
      setRepaymentLoanId(null)
      setRepaymentAmount("")
      await loadData()
    } catch (err: any) {
      setError(err.message || "Failed to submit repayment")
    } finally {
      setRequesting(false)
    }
  }

  async function handleRequestLoan() {
    setRequesting(true)
    setError("")
    setSuccess("")

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Please log in to request a loan")
      }

      // Get the profile data on the client side where RLS allows it
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("base_structure, personal_capital, full_name, email")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        throw new Error("User profile not found")
      }

      const loanAmount = Number.parseFloat(amount)
      const result = await requestLoanAction(loanAmount, user.id, profile)

      setSuccess("Loan request submitted successfully!")
      setAmount("")
      await loadData()
    } catch (err: any) {
      setError(err.message || "Failed to request loan")
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  console.log("[v0] Loans page rendering with eligibility:", eligibility)

  if (!eligibility?.eligible) {
    console.log("[v0] User not eligible for loans. eligibility object:", eligibility)
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
              <p className="text-sm text-muted-foreground">Minimum Loan Amount (50%)</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(eligibility.max_loan_amount * 0.625)}</p>
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
                placeholder="Enter amount between 50-80% of portfolio"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={eligibility.max_loan_amount * 0.625}
                max={eligibility.max_loan_amount}
              />
              <p className="text-xs text-muted-foreground">
                Range: {formatCurrency(eligibility.max_loan_amount * 0.625)} - {formatCurrency(eligibility.max_loan_amount)}
              </p>
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

                  {(loan.status === "active" || loan.status === "approved") && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <span className="font-medium">{formatCurrency(loan.repaid_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-medium">{formatCurrency(loan.total_due - (loan.repaid_amount || 0))}</span>
                      </div>

                      {/* Bank Account Details for Repayment - Fetch from profiles or show JDShark account */}
                      <div className="bg-accent/5 p-3 rounded-md space-y-2 text-sm">
                        <p className="font-semibold text-foreground">JDShark Repayment Account</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Name:</span>
                            <span className="font-medium">{loan.profiles?.account_name || "JDShark Investment Ltd"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bank Name:</span>
                            <span className="font-medium">{loan.profiles?.bank_name || "Contact Support"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Number:</span>
                            <span className="font-medium">{loan.profiles?.account_number || "Contact Support"}</span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => handleRepaymentClick(loan)}
                      >
                        Submit Repayment Request
                      </Button>
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

      {/* Repayment Dialog */}
      {showRepaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Loan Repayment</CardTitle>
              <CardDescription>Submit your loan repayment request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loans.find((l) => l.id === repaymentLoanId) && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Principal Amount</p>
                    <p className="text-lg font-semibold">{formatCurrency(loans.find((l) => l.id === repaymentLoanId)?.principal_amount || 0)}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Interest Accrued</p>
                    <p className="text-lg font-semibold text-accent">{formatCurrency((loans.find((l) => l.id === repaymentLoanId)?.total_due || 0) - (loans.find((l) => l.id === repaymentLoanId)?.principal_amount || 0))}</p>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Total Repayment Amount</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(loans.find((l) => l.id === repaymentLoanId)?.total_due || 0)}</p>
                  </div>

                  {/* Bank Details */}
                  {loans.find((l) => l.id === repaymentLoanId)?.profiles && (
                    <div className="bg-accent/5 p-3 rounded-md space-y-2 text-sm">
                      <p className="font-semibold text-foreground">Transfer to:</p>
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground">Account Name: </span>
                          <span className="font-medium">{loans.find((l) => l.id === repaymentLoanId)?.profiles?.account_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bank: </span>
                          <span className="font-medium">{loans.find((l) => l.id === repaymentLoanId)?.profiles?.bank_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account Number: </span>
                          <span className="font-medium">{loans.find((l) => l.id === repaymentLoanId)?.profiles?.account_number || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="repayment-amount">Amount to Pay (₦)</Label>
                    <Input
                      id="repayment-amount"
                      type="number"
                      value={repaymentAmount}
                      onChange={(e) => setRepaymentAmount(e.target.value)}
                      min={loans.find((l) => l.id === repaymentLoanId)?.total_due || 0}
                      disabled={requesting}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setShowRepaymentDialog(false)}
                  disabled={requesting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitRepayment}
                  disabled={requesting || !repaymentAmount}
                >
                  {requesting ? "Submitting..." : "Submit Repayment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
