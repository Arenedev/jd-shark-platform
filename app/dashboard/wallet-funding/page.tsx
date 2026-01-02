"use client"

import { useState } from "react"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaystackButton } from "@/components/payment/paystack-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function WalletFundingPage() {
  const searchParams = useSearchParams()
  const [amount, setAmount] = useState<number>(5000)
  const [loading, setLoading] = useState(false)

  // Handle Paystack callback
  useEffect(() => {
    const reference = searchParams.get("reference")
    if (reference) {
      handlePaymentVerification(reference)
    }
  }, [searchParams])

  const handlePaymentVerification = async (reference: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      })

      if (response.ok) {
        redirect("/dashboard/wallet?success=true")
      }
    } catch (error) {
      console.error("Verification error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fund Wallet</h1>
          <p className="text-muted-foreground">Add funds to your JD SHARK wallet via Paystack</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Select Amount</CardTitle>
              <CardDescription>Choose an amount to fund your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1000"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-2"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Quick amounts:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[5000, 10000, 50000].map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount)}
                      className={`p-2 rounded border text-sm font-medium transition ${
                        amount === quickAmount
                          ? "bg-primary text-white border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      ₦{quickAmount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <PaystackButton amount={amount} />

              <Alert>
                <AlertDescription className="text-xs">
                  Your wallet will be credited immediately after successful payment. All transactions are secured with
                  Paystack.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">1. Enter Amount</h4>
                <p className="text-muted-foreground">Specify how much you want to fund</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">2. Click Fund Wallet</h4>
                <p className="text-muted-foreground">You'll be redirected to Paystack payment page</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">3. Complete Payment</h4>
                <p className="text-muted-foreground">Enter your card details securely</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">4. Instant Credit</h4>
                <p className="text-muted-foreground">Your wallet is credited immediately</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
