"use client"

import { useState, useEffect } from "react"
import { checkAdminSession } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/client"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])

  useEffect(() => {
    if (!checkAdminSession()) {
      window.location.href = "/admin/login"
      return
    }
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()
    const [usersResult, walletsResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("*"),
    ])

    setUsers(usersResult.data || [])
    setWallets(walletsResult.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
          <p className="text-muted-foreground">View and manage all platform users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Complete list of registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Base Structure</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((usr: any) => {
                  const wallet = wallets?.find((w: any) => w.user_id === usr.id)
                  return (
                    <TableRow key={usr.id}>
                      <TableCell className="font-medium">{usr.full_name || "Unknown"}</TableCell>
                      <TableCell>{usr.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {usr.base_structure || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {usr.current_rank || "Unranked"}
                        </Badge>
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
                      <TableCell className="font-semibold">₦{(wallet?.balance || 0).toLocaleString()}</TableCell>
                      <TableCell>{new Date(usr.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
