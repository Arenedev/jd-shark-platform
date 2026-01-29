"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"
import { checkAdminSession } from "@/lib/admin-auth"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface LoanRepaymentRequest {
  id: string
  loan_id: string
  user_id: string
  principal_amount: number
  interest_accrued: number
  total_repayment_amount: number
  payment_reference_code: string
  status: string
  created_at: string
  requested_at: string
  profiles: any
  organization_loans: any
}

export default function AdminRepaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [repayments, setRepayments] = useState<LoanRepaymentRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const isAuthenticated = checkAdminSession()
    if (!isAuthenticated) {
      router.push("/admin/login")
      return
    }

    fetchRepayments()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchRepayments, 30000)
    return () => clearInterval(interval)
  }, [router])

  const fetchRepayments = async () => {
    try {
      console.log("[v0] Fetching admin repayments data...")
      const response = await fetch("/api/admin/repayments")

      const data = await response.json()
      console.log("[v0] API response:", { status: response.status, count: data.repayments?.length })

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch data (status: ${response.status})`)
      }

      const repaymentsData = data.repayments || []
      console.log("[v0] Repayments data received:", repaymentsData.length)
      setRepayments(repaymentsData)
    } catch (error: any) {
      console.error("[v0] Error fetching repayments:", error.message)
      setRepayments([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleAction = async (repaymentId: string, action: "approve" | "reject") => {
    setProcessingId(repaymentId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/repayments/${repaymentId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to process repayment")
      }

      setSuccess(data.message || `Repayment ${action}ed successfully`)
      await fetchRepayments()
    } catch (err: any) {
      setError(err.message || "Failed to process repayment")
    } finally {
      setProcessingId(null)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await fetchRepayments()
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading repayment requests...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Loan Repayments</h1>
            <p className="text-muted-foreground mt-2">Review and approve loan repayment requests</p>
          </div>
          <Button
            onClick={handleManualRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Repayments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repayments.filter((r) => r.status === "pending").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repayments.filter((r) => r.status === "approved").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(repayments.reduce((sum, r) => sum + (r.total_repayment_amount || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repayment Requests</CardTitle>
            <CardDescription>List of all loan repayment requests awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {repayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No repayment requests found</p>
            ) : (
              <div className="space-y-4">
                {repayments.map((repayment) => (
                  <div key={repayment.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <p className="font-semibold text-lg">{repayment.profiles?.full_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{repayment.profiles?.email}</p>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          repayment.status === "pending"
                            ? "default"
                            : repayment.status === "approved"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {repayment.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-accent/5 p-3 rounded-md">
                      <div>
                        <p className="text-xs text-muted-foreground">Principal</p>
                        <p className="font-semibold">{formatCurrency(repayment.principal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interest</p>
                        <p className="font-semibold">{formatCurrency(repayment.interest_accrued)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Repayment</p>
                        <p className="font-semibold text-primary">{formatCurrency(repayment.total_repayment_amount)}</p>
                      </div>
                    </div>

                    {/* Bank Details */}
                    {repayment.profiles && (
                      <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                        <p className="font-semibold">Transfer Account Details:</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-muted-foreground">Account Name:</span>
                            <p className="font-medium">{repayment.profiles.bank_account_name || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bank:</span>
                            <p className="font-medium">{repayment.profiles.bank_name || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Account Number:</span>
                            <p className="font-medium">{repayment.profiles.bank_account_number || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Reference Code */}
                    {repayment.payment_reference_code && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-muted-foreground mb-2">Payment Reference Code (for transaction description):</p>
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300">{repayment.payment_reference_code}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(repayment.payment_reference_code)
                            }}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Requested: {new Date(repayment.requested_at || repayment.created_at).toLocaleString()}
                    </p>

                    {repayment.status === "pending" && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAction(repayment.id, "approve")}
                          disabled={processingId === repayment.id}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(repayment.id, "reject")}
                          disabled={processingId === repayment.id}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
