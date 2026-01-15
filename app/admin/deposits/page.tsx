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
import { getAllDepositRequests, type DepositRequest } from "@/lib/api/deposits"
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react"

export default function AdminDepositsPage() {
  const [loading, setLoading] = useState(true)
  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [filteredDeposits, setFilteredDeposits] = useState<DepositRequest[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal state
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null)
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
  }, [])

  async function fetchData() {
    const allDeposits = await getAllDepositRequests()
    setDeposits(allDeposits)
    setFilteredDeposits(allDeposits)
    setLoading(false)
  }

  useEffect(() => {
    let filtered = deposits

    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.transaction_reference?.toLowerCase().includes(query) ||
          (d.profiles as any)?.full_name?.toLowerCase().includes(query) ||
          (d.profiles as any)?.email?.toLowerCase().includes(query),
      )
    }

    setFilteredDeposits(filtered)
  }, [statusFilter, searchQuery, deposits])

  const handleAction = async () => {
    if (!selectedDeposit || !actionType) return

    if (actionType === "reject" && !rejectionReason) {
      alert("Please provide a rejection reason")
      return
    }

    setProcessing(true)

    try {
      const response = await fetch("/api/admin/deposits/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId: selectedDeposit.id,
          action: actionType,
          note: adminNote,
          rejectionReason: actionType === "reject" ? rejectionReason : undefined,
        }),
      })

      if (response.ok) {
        const allDeposits = await getAllDepositRequests()
        setDeposits(allDeposits)
        setSelectedDeposit(null)
        setActionType(null)
        setAdminNote("")
        setRejectionReason("")
      } else {
        const data = await response.json()
        alert(data.message || "Action failed")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to process action")
    } finally {
      setProcessing(false)
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

  const stats = {
    total: deposits.length,
    pending: deposits.filter((d) => d.status === "pending").length,
    approved: deposits.filter((d) => d.status === "approved").length,
    totalAmount: deposits.filter((d) => d.status === "approved").reduce((sum, d) => sum + d.amount, 0),
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deposit Management</h1>
          <p className="text-muted-foreground">Review and approve deposit requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                  <p className="text-2xl font-bold">₦{stats.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Alert */}
        {stats.pending > 0 && (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <div className="text-yellow-600">
              You have {stats.pending} pending deposit request{stats.pending > 1 ? "s" : ""} awaiting review.
            </div>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
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
          </CardContent>
        </Card>

        {/* Deposits Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deposit Requests</CardTitle>
            <CardDescription>Review and process deposit requests</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDeposits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No deposit requests found</div>
            ) : (
              <div className="space-y-4">
                {filteredDeposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/30 rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{(deposit.profiles as any)?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{(deposit.profiles as any)?.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {deposit.transaction_reference} • {deposit.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">₦{deposit.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(deposit.status)}
                      {deposit.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-500 border-green-500/30 hover:bg-green-500/10 bg-transparent"
                            onClick={() => {
                              setSelectedDeposit(deposit)
                              setActionType("approve")
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-500/30 hover:bg-red-500/10 bg-transparent"
                            onClick={() => {
                              setSelectedDeposit(deposit)
                              setActionType("reject")
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {deposit.payment_proof_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={deposit.payment_proof_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Modal */}
        <Dialog open={!!selectedDeposit && !!actionType} onOpenChange={() => setSelectedDeposit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionType === "approve" ? "Approve Deposit" : "Reject Deposit"}</DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? "This will create an investment for the user with the deposit amount."
                  : "This will reject the deposit request. A reason is required."}
              </DialogDescription>
            </DialogHeader>

            {selectedDeposit && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{(selectedDeposit.profiles as any)?.full_name}</p>
                  <p className="text-sm text-muted-foreground mt-2">Amount</p>
                  <p className="font-bold text-xl">₦{selectedDeposit.amount.toLocaleString()}</p>
                </div>

                {actionType === "reject" && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="adminNote">Admin Note (Optional)</Label>
                  <Textarea
                    id="adminNote"
                    placeholder="Add a note..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDeposit(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing}
                className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : actionType === "approve" ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {actionType === "approve" ? "Approve Deposit" : "Reject Deposit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
