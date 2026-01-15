"use client"

import { useState, useEffect } from "react"
import { checkAdminSession } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/client"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function AdminKYCPage() {
  const [loading, setLoading] = useState(true)
  const [kycUsers, setKycUsers] = useState<any[]>([])
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
    const supabase = createClient()
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    setKycUsers(data || [])
    setLoading(false)
  }

  async function handleKYCAction(userId: string, status: "approved" | "rejected") {
    setProcessing(userId)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("id", userId)

      if (error) throw error

      toast({
        title: "Success",
        description: `KYC ${status} successfully`,
      })
      await fetchData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update KYC status",
      })
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading KYC data...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">KYC Verification</h1>
          <p className="text-muted-foreground">Manage Know Your Customer verification</p>
        </div>

        {/* KYC Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {kycUsers?.filter((u: any) => u.kyc_status === "approved").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {kycUsers?.filter((u: any) => u.kyc_status === "pending").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {kycUsers?.filter((u: any) => u.kyc_status === "rejected").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KYC Records */}
        <Card>
          <CardHeader>
            <CardTitle>All KYC Records</CardTitle>
            <CardDescription>Manage user verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kycUsers?.map((usr: any) => (
                  <TableRow key={usr.id}>
                    <TableCell className="font-medium">{usr.full_name}</TableCell>
                    <TableCell>{usr.email}</TableCell>
                    <TableCell>
                      {usr.kyc_document_url ? (
                        <a
                          href={usr.kyc_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Document
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No document</span>
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
                    <TableCell>{new Date(usr.created_at).toLocaleDateString()}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
