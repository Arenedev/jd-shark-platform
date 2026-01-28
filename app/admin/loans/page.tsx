"use client"

import { Alert } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { checkAdminSession } from "@/lib/admin-auth"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  DollarSign,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function AdminLoansPage() {
  const [loading, setLoading] = useState(true)
  const [loans, setLoans] = useState<any[]>([])
  const [filteredLoans, setFilteredLoans] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal state
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!checkAdminSession()) {
      window.location.href = "/admin/login"
      return
    }
    fetchData()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      console.log("[v0] Fetching admin loans data...")
      const response = await fetch("/api/admin/loans")

      if (!response.ok) throw new Error("Failed to fetch data")

      const data = await response.json()
      console.log("[v0] Loans data received:", data)

      const loansData = data.loans || []
      setLoans(loansData)
      setFilteredLoans(loansData)
    } catch (error) {
      console.error("[v0] Error fetching loans:", error)
      setLoans([])
      setFilteredLoans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = loans

    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.profiles?.full_name?.toLowerCase().includes(query) ||
          l.profiles?.email?.toLowerCase().includes(query) ||
          l.id?.toLowerCase().includes(query),
      )
    }

    setFilteredLoans(filtered)
  }, [statusFilter, searchQuery, loans])

  async function handleAction() {
    if (!selectedLoan) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/loans/${selectedLoan.id}/${actionType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNote: adminNote || rejectionReason,
          reason: rejectionReason,
        }),
      })

      if (!response.ok) throw new Error("Failed to process loan")

      setSelectedLoan(null)
      setActionType(null)
      setAdminNote("")
      setRejectionReason("")
      await fetchData()
    } catch (error: any) {
      console.error("[v0] Error processing loan:", error)
      alert(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex justify-center items-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Organization Loans</h1>
          <p className="text-muted-foreground">Manage loan requests from organizations</p>
        </div>

        <div className="flex gap-4 flex-col md:flex-row">
          <Input
            placeholder="Search by name, email, or loan ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            icon={<Search className="w-4 h-4" />}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLoans.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No loans found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredLoans.map((loan) => (
              <Card key={loan.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* User Info */}
                    <div>
                      <p className="text-sm text-muted-foreground">Organization</p>
                      <p className="font-semibold">{loan.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{loan.profiles?.email}</p>
                    </div>

                    {/* Loan Amount */}
                    <div>
                      <p className="text-sm text-muted-foreground">Principal Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(loan.principal_amount)}
                      </p>
                    </div>

                    {/* Interest & Total Due */}
                    <div>
                      <p className="text-sm text-muted-foreground">Total Due (with interest)</p>
                      <p className="text-lg font-semibold">{formatCurrency(loan.total_due)}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.interest_rate}% monthly
                      </p>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Status</p>
                        {getStatusBadge(loan.status)}
                      </div>
                      {loan.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLoan(loan)}
                          className="mt-2"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Portfolio Value</p>
                      <p className="font-semibold">
                        {formatCurrency(loan.profiles?.personal_capital || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Account Type</p>
                      <p className="font-semibold capitalize">{loan.profiles?.base_structure}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requested on</p>
                      <p className="font-semibold">
                        {new Date(loan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={selectedLoan !== null} onOpenChange={() => setSelectedLoan(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Loan Request</DialogTitle>
              <DialogDescription>
                Organization: {selectedLoan?.profiles?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Principal Amount</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedLoan?.principal_amount)}
                  </p>
                </div>
                <div>
                  <Label>Total Due</Label>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(selectedLoan?.total_due)}
                  </p>
                </div>
                <div>
                  <Label>Portfolio Value</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedLoan?.profiles?.personal_capital)}
                  </p>
                </div>
                <div>
                  <Label>Loan as % of Portfolio</Label>
                  <p className="text-lg font-semibold">
                    {selectedLoan
                      ? `${((selectedLoan.principal_amount / selectedLoan.profiles?.personal_capital) * 100).toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
              </div>

              {actionType === "reject" ? (
                <div>
                  <Label htmlFor="reason">Rejection Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="note">Admin Note (Optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Add any additional notes..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedLoan(null)
                  setActionType(null)
                  setAdminNote("")
                  setRejectionReason("")
                }}
              >
                Cancel
              </Button>
              {!actionType ? (
                <>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 bg-transparent"
                    onClick={() => setActionType("reject")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setActionType("approve")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              ) : (
                <Button
                  disabled={processing}
                  onClick={handleAction}
                  className={actionType === "approve" ? "bg-green-600" : "bg-red-600"}
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
