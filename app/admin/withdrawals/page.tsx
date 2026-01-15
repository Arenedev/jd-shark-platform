"use client"

import { useState, useEffect } from "react"
import { checkAdminSession } from "@/lib/admin-auth"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface WithdrawalWithProfile {
  id: string
  amount: number
  status: string
  bank_name: string
  account_number: string
  account_name: string
  admin_note?: string
  created_at: string
  profiles: {
    full_name: string
    email: string
  }
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithProfile | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [processing, setProcessing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const { toast } = useToast()

  useEffect(() => {
    if (!checkAdminSession()) {
      window.location.href = "/admin/login"
      return
    }
    fetchWithdrawals()
  }, [])

  const fetchWithdrawals = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setWithdrawals(data || [])
    } catch (error) {
      console.error("Error fetching withdrawals:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch withdrawal requests",
      })
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (withdrawal: WithdrawalWithProfile, action: "approve" | "reject") => {
    setSelectedWithdrawal(withdrawal)
    setActionType(action)
    setAdminNote("")
    setDialogOpen(true)
  }

  const handleAction = async () => {
    if (!selectedWithdrawal) return

    setProcessing(true)
    try {
      const response = await fetch("/api/admin/withdrawals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          status: actionType === "approve" ? "approved" : "rejected",
          adminNote,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process withdrawal")
      }

      toast({
        title: "Success",
        description: `Withdrawal ${actionType === "approve" ? "approved" : "rejected"} successfully`,
      })

      setDialogOpen(false)
      await fetchWithdrawals()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process withdrawal",
      })
    } finally {
      setProcessing(false)
    }
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending")
  const processedWithdrawals = withdrawals.filter((w) => w.status !== "pending")

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading withdrawals...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Withdrawal Requests</h1>
          <p className="text-muted-foreground">Review and approve withdrawal requests</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingWithdrawals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{processedWithdrawals.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Withdrawals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>Withdrawal requests awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingWithdrawals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{withdrawal.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">₦{withdrawal.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{withdrawal.bank_name}</p>
                          <p className="text-muted-foreground">{withdrawal.account_number}</p>
                          <p className="text-muted-foreground">{withdrawal.account_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openDialog(withdrawal, "approve")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openDialog(withdrawal, "reject")}>
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No pending withdrawal requests</p>
            )}
          </CardContent>
        </Card>

        {/* Processed Withdrawals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Processed Requests</CardTitle>
            <CardDescription>Previously approved or rejected withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            {processedWithdrawals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedWithdrawals.slice(0, 10).map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{withdrawal.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">₦{withdrawal.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            withdrawal.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{withdrawal.admin_note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No processed withdrawals yet</p>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionType === "approve" ? "Approve" : "Reject"} Withdrawal Request</DialogTitle>
              <DialogDescription>
                {selectedWithdrawal && (
                  <div className="space-y-2 mt-4">
                    <p>
                      <strong>User:</strong> {selectedWithdrawal.profiles?.full_name}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₦{selectedWithdrawal.amount.toLocaleString()}
                    </p>
                    <p>
                      <strong>Bank:</strong> {selectedWithdrawal.bank_name}
                    </p>
                    <p>
                      <strong>Account:</strong> {selectedWithdrawal.account_number} - {selectedWithdrawal.account_name}
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="adminNote">Admin Note (Optional)</Label>
                <Textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note about this decision..."
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing}
                className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={actionType === "reject" ? "destructive" : "default"}
              >
                {processing ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
