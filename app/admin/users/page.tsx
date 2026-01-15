"use client"

import { useState, useEffect } from "react"
import { checkAdminSession } from "@/lib/admin-auth"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

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
    try {
      const response = await fetch("/api/admin/stats")
      if (!response.ok) throw new Error("Failed to fetch data")

      const data = await response.json()
      console.log("[v0] Admin users data:", data)

      // Extract users and wallets from the API response
      setUsers(data.users || [])
      setWallets(data.wallets || [])
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
      setUsers([])
      setWallets([])
    } finally {
      setLoading(false)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manage Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage all platform users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">All Users</CardTitle>
            <CardDescription className="text-sm">Complete list of registered users</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Base Structure</TableHead>
                  <TableHead className="whitespace-nowrap">Rank</TableHead>
                  <TableHead className="whitespace-nowrap">KYC Status</TableHead>
                  <TableHead className="whitespace-nowrap">Wallet Balance</TableHead>
                  <TableHead className="whitespace-nowrap">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((usr: any) => {
                  const wallet = wallets?.find((w: any) => w.user_id === usr.id)
                  return (
                    <TableRow key={usr.id}>
                      <TableCell className="font-medium whitespace-nowrap">{usr.full_name || "Unknown"}</TableCell>
                      <TableCell className="whitespace-nowrap">{usr.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize whitespace-nowrap">
                          {usr.base_structure || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize whitespace-nowrap">
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
                      <TableCell className="font-semibold whitespace-nowrap">
                        ₦{(wallet?.balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(usr.created_at).toLocaleDateString()}
                      </TableCell>
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
