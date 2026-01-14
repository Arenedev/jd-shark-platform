"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { getUserDepositRequests, type DepositRequest } from "@/lib/api/deposits"
import {
  Loader2,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Building,
  Smartphone,
} from "lucide-react"

export default function WalletFundingPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(50000)
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer")
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      // Fetch deposit requests
      const requests = await getUserDepositRequests(user.id)
      setDepositRequests(requests)
      setLoadingRequests(false)
    }

    fetchData()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!userId) {
      setError("User not authenticated")
      return
    }

    if (amount < 1000) {
      setError("Minimum deposit is ₦1,000")
      return
    }

    if (!paymentProofUrl) {
      setError("Payment proof URL is required")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount,
          paymentMethod,
          paymentProofUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create deposit request")
      }

      setSuccess(true)
      // Refresh deposit requests
      const requests = await getUserDepositRequests(userId)
      setDepositRequests(requests)

      // Reset form
      setAmount(50000)
      setPaymentProofUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit deposit request")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return <Building className="w-4 h-4" />
      case "card":
        return <CreditCard className="w-4 h-4" />
      case "ussd":
        return <Smartphone className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fund Wallet</h1>
          <p className="text-muted-foreground">Submit a deposit request to fund your JD SHARK wallet</p>
        </div>

        <Alert className="bg-blue-500/10 border-blue-500/30">
          <AlertCircle className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-blue-400">
            All deposits are manually verified by our admin team. Your wallet will be credited once your payment is
            confirmed. This usually takes 1-24 hours.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Deposit Request Form */}
          <Card>
            <CardHeader>
              <CardTitle>New Deposit Request</CardTitle>
              <CardDescription>Submit a deposit request to fund your wallet</CardDescription>
            </CardHeader>
            <CardContent>
              {success && (
                <Alert className="mb-4 bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <AlertDescription className="text-green-400">
                    Deposit request submitted successfully! Our team will review it shortly.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1000"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="text-lg"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum deposit: ₦1,000</p>
                </div>

                <div className="space-y-2">
                  <Label>Quick amounts:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[50000, 100000, 500000].map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => setAmount(quickAmount)}
                        className={`p-2 rounded border text-sm font-medium transition ${
                          amount === quickAmount
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        ₦{quickAmount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card Payment</SelectItem>
                      <SelectItem value="ussd">USSD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentProof">Payment Proof (Required)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="paymentProof"
                      type="url"
                      placeholder="https://imgur.com/... or image URL"
                      value={paymentProofUrl}
                      onChange={(e) => setPaymentProofUrl(e.target.value)}
                      required
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required: Upload your payment receipt to an image host (e.g., Imgur) and paste the URL here
                  </p>
                </div>

                {/* Bank Details */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Bank Transfer Details:</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Bank:</span> First Bank Nigeria
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account Name:</span> JD SHARK LTD
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account Number:</span> 1234567890
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Deposit Request"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Deposit History */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>Track your deposit requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : depositRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No deposit requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {depositRequests.slice(0, 10).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPaymentMethodIcon(request.payment_method)}
                        <div>
                          <p className="font-medium">₦{request.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(request.status)}
                        {request.rejection_reason && (
                          <p className="text-xs text-red-400 mt-1 max-w-[150px] truncate">{request.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
