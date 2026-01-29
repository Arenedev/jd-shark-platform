"use client"

import React from "react"

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
  const [generatedPaymentCode, setGeneratedPaymentCode] = useState<string>("")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string>("")

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
    setGeneratedPaymentCode("")
    setShowRepaymentDialog(true)
  }

  async function handleGeneratePaymentCode() {
    if (!repaymentLoanId) return

    setRequesting(true)
    setError("")

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Please log in to generate payment code")
      }

      const loan = loans.find((l) => l.id === repaymentLoanId)

      if (!loan) {
        throw new Error("Loan not found")
      }

      // Generate payment code
      const response = await fetch("/api/user/loan-repayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: repaymentLoanId,
          userId: user.id,
          amount: repaymentAmount,
          principalAmount: loan.principal_amount.toString(),
          interestAccrued: (loan.total_due - loan.principal_amount).toString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate payment code")
      }

      setGeneratedPaymentCode(data.paymentCode)
      setSuccess("Payment code generated successfully! Use it as your transaction description.")
    } catch (err: any) {
      setError(err.message || "Failed to generate payment code")
    } finally {
      setRequesting(false)
    }
  }

  async function handleSubmitRepayment() {
    if (!repaymentLoanId || !generatedPaymentCode) {
      setError("Please generate a payment code first")
      return
    }

    setRequesting(true)
    setError("")

    try {
      // Simply close modal - the repayment request was already created when code was generated
      setSuccess("Repayment submitted successfully! Please make your transfer using the provided code.")
      setShowRepaymentDialog(false)
      setRepaymentLoanId(null)
      setRepaymentAmount("")
      setGeneratedPaymentCode("")
      await loadData()
    } catch (err: any) {
      setError(err.message || "Failed to submit repayment")
    } finally {
      setRequesting(false)
    }
  }

  async function handleRequestLoan() {
    if (!eligibility) return

    setError("")
    setRequesting(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Please log in to request a loan")
      }

      const supabaseData = await supabase.auth.getSession()
      const { data: profileData } = await supabase
        .from("profiles")
        .select("base_structure, personal_capital")
        .eq("id", user.id)
        .single()

      if (!profileData) {
        throw new Error("Could not fetch user profile")
      }

      const loanAmount = Number.parseFloat(amount)

      if (!amount || loanAmount <= 0) {
        throw new Error("Please enter a valid loan amount")
      }

      // Check if total of existing pending + approved loans + new request exceeds max
      const totalExistingLoan = loans
        .filter((l) => l.status === "pending" || l.status === "approved")
        .reduce((sum, l) => sum + l.principal_amount, 0)

      const totalWithNewLoan = totalExistingLoan + loanAmount

      if (totalWithNewLoan > eligibility.max_loan_amount) {
        throw new Error(
          `Total loan amount (₦${totalWithNewLoan.toLocaleString()}) exceeds maximum eligible amount (₦${eligibility.max_loan_amount.toLocaleString()}). You already have ₦${totalExistingLoan.toLocaleString()} in pending/approved loans.`
        )
      }

      const result = await requestLoanAction(loanAmount, user.id, profileData)

      setSuccess("Loan request submitted successfully! Admin will review and approve.")
      setAmount("")
      await loadData()
    } catch (err: any) {
      setError(err.message || "Failed to request loan")
    } finally {
      setRequesting(false)
    }
  }

  function handleProofFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setPaymentProof(file)
      setProofPreview(URL.createObjectURL(file))
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

                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => handleRepaymentClick(loan)}
                      >
                        Repay Loan
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

      {/* Repayment Dialog - Responsive Modal */}
      {showRepaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-background border-b">
              <CardTitle>Loan Repayment</CardTitle>
              <CardDescription>Generate a payment code and submit your repayment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loans.find((l) => l.id === repaymentLoanId) && (
                <>
                  {/* Loan Details Section */}
                  <div className="space-y-3 bg-accent/5 p-4 rounded-lg">
                    <p className="font-semibold text-foreground">Loan Summary</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Principal Amount</p>
                        <p className="text-lg font-semibold">{formatCurrency(loans.find((l) => l.id === repaymentLoanId)?.principal_amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interest Accrued</p>
                        <p className="text-lg font-semibold text-accent">{formatCurrency((loans.find((l) => l.id === repaymentLoanId)?.total_due || 0) - (loans.find((l) => l.id === repaymentLoanId)?.principal_amount || 0))}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-muted-foreground">Total Amount Due</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(loans.find((l) => l.id === repaymentLoanId)?.total_due || 0)}</p>
                    </div>
                  </div>

                  {/* Bank Account Details - Now in Modal */}
                  <div className="space-y-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                    <p className="font-semibold text-foreground">Transfer Payment To:</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="text-sm font-medium">{loans.find((l) => l.id === repaymentLoanId)?.profiles?.account_name || "JDShark Investment Ltd"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Name</p>
                        <p className="text-sm font-medium">{loans.find((l) => l.id === repaymentLoanId)?.profiles?.bank_name || "Contact Support for details"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="text-sm font-medium">{loans.find((l) => l.id === repaymentLoanId)?.profiles?.account_number || "Contact Support for details"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Generate Payment Code Section */}
                  {!generatedPaymentCode ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-900">
                        ⚠️ First, generate a payment code that you'll use as the transaction description when making your bank transfer.
                      </p>
                      <Button 
                        className="w-full" 
                        onClick={handleGeneratePaymentCode}
                        disabled={requesting}
                      >
                        {requesting ? "Generating..." : "Generate Payment Code"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
                      <p className="font-semibold text-foreground text-green-900 dark:text-green-100">✓ Payment Code Generated</p>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Use this code as payment description:</p>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded border border-green-300 dark:border-green-700 flex items-center justify-between gap-2">
                          <code className="text-lg font-mono font-bold text-primary">{generatedPaymentCode}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPaymentCode)
                              setSuccess("Code copied to clipboard!")
                            }}
                            className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Transfer ₦{repaymentAmount} to the account above using this code as the transaction description.
                        </p>
                      </div>
                    </div>
                  )}

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setShowRepaymentDialog(false)
                    setGeneratedPaymentCode("")
                    setRepaymentLoanId(null)
                    setRepaymentAmount("")
                  }}
                  disabled={requesting}
                >
                  Cancel
                </Button>
                {generatedPaymentCode && (
                  <Button
                    className="flex-1"
                    onClick={handleSubmitRepayment}
                    disabled={requesting}
                  >
                    {requesting ? "Submitting..." : "Submit Repayment"}
                  </Button>
                )}
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
