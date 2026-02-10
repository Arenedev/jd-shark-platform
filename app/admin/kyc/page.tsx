"use client"

import { useState, useEffect } from "react"
import { checkAdminSession } from "@/lib/admin-auth"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye } from "lucide-react"

export default function AdminKYCPage() {
  const [loading, setLoading] = useState(true)
  const [kycUsers, setKycUsers] = useState<any[]>([])
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0 })
  const [processing, setProcessing] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!checkAdminSession()) {
      window.location.href = "/admin/login"
      return
    }
    fetchData()
  }, [])

  async function fetchData() {
    try {
      console.log("[v0] Fetching KYC stats and data...")

      // Fetch stats
      const statsResponse = await fetch("/api/admin/kyc-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json()
        console.log("[v0] KYC stats received:", statsResult.stats)
        setStats(statsResult.stats)
      }

      // Fetch all KYC submissions (including approved and rejected for full view)
      const allResponse = await fetch("/api/admin/kyc-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fetchAll: true }),
      })

      if (!allResponse.ok) {
        throw new Error(`API error: ${allResponse.statusText}`)
      }

      const result = await allResponse.json()
      console.log("[v0] All KYC data received:", result)
      setKycUsers(result.data || [])
    } catch (error) {
      console.error("[v0] Error fetching KYC data:", error)
      toast({
        title: "Error",
        description: "Failed to load KYC submissions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleKYCAction(userId: string, status: "approved" | "rejected") {
    setProcessing(userId)
    try {
      console.log("[v0] Submitting KYC action:", { userId, status })
      const response = await fetch("/api/admin/approve-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[v0] KYC action completed:", result)

      toast({
        title: "Success",
        description: `KYC ${status} successfully`,
      })

      // Refresh the list and stats
      await fetchData()
    } catch (error) {
      console.error("[v0] Error processing KYC action:", error)
      toast({
        title: "Error",
        description: `Failed to ${status} KYC`,
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
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
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">KYC Verification</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage Know Your Customer verification</p>
        </div>

        {/* KYC Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.approved}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KYC Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">All KYC Records</CardTitle>
            <CardDescription className="text-sm">Manage user verification status</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Document</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kycUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No KYC submissions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  kycUsers?.map((usr: any) => (
                    <TableRow key={usr.id}>
                      <TableCell className="font-medium whitespace-nowrap">{usr.full_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{usr.email}</TableCell>
                      <TableCell>
                        {usr.kyc_document_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => window.open(usr.kyc_document_url, "_blank")}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No document</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            usr.kyc_status === "approved"
                              ? "bg-green-100 text-green-800"
                              : usr.kyc_status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {usr.kyc_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(usr.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {usr.kyc_status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleKYCAction(usr.id, "approved")}
                              disabled={processing === usr.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {processing === usr.id ? "..." : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleKYCAction(usr.id, "rejected")}
                              disabled={processing === usr.id}
                            >
                              {processing === usr.id ? "..." : "Reject"}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
