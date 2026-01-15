"use client"

import { useState, useEffect } from "react"
import { createAdminClient } from "@/lib/supabase/admin-client"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

function checkAdminSession(): boolean {
  if (typeof window === "undefined") return false

  try {
    const sessionStr = localStorage.getItem("jdshark_admin_session")
    if (!sessionStr) return false

    const session = JSON.parse(sessionStr)
    if (!session.authenticated) return false

    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem("jdshark_admin_session")
      return false
    }

    return true
  } catch {
    return false
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    activeInvestments: 0,
    totalWalletBalance: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    investorCount: 0,
    orgCount: 0,
    associateCount: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [pendingKYCUsers, setPendingKYCUsers] = useState<any[]>([])

  useEffect(() => {
    const isAdmin = checkAdminSession()

    if (!isAdmin) {
      window.location.href = "/admin/login"
      return
    }

    setIsAuthenticated(true)
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const supabase = createAdminClient()

      const [usersResult, walletsResult, investmentsResult, depositsResult, withdrawalsResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("wallets").select("balance"),
        supabase.from("investments").select("*"),
        supabase.from("deposit_requests").select("*").eq("status", "pending"),
        supabase.from("withdrawal_requests").select("*").eq("status", "pending"),
      ])

      const users = usersResult.data || []
      const wallets = walletsResult.data || []
      const investments = investmentsResult.data || []
      const deposits = depositsResult.data || []
      const withdrawals = withdrawalsResult.data || []

      const totalBalance = wallets.reduce((sum: number, w: any) => sum + (w.balance || 0), 0)
      const pendingKYC = users.filter((u: any) => u.kyc_status === "pending").length

      const investorCount = users.filter((u: any) => u.base_structure === "investor").length
      const orgCount = users.filter((u: any) => u.base_structure === "organization").length
      const associateCount = users.filter((u: any) => u.base_structure === "associate").length

      setStats({
        totalUsers: users.length,
        pendingKYC,
        activeInvestments: investments.length,
        totalWalletBalance: totalBalance,
        pendingDeposits: deposits.length,
        pendingWithdrawals: withdrawals.length,
        investorCount,
        orgCount,
        associateCount,
      })

      setRecentUsers(users.slice(0, 5))
      setPendingKYCUsers(users.filter((u: any) => u.kyc_status === "pending").slice(0, 10))
    } catch (error) {
      console.error("[v0] Error fetching admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || loading) {
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
      <div className="space-y-6 md:space-y-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor platform activity and manage users</p>
        </div>

        {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              You have {stats.pendingDeposits > 0 && `${stats.pendingDeposits} pending deposit(s)`}
              {stats.pendingDeposits > 0 && stats.pendingWithdrawals > 0 && " and "}
              {stats.pendingWithdrawals > 0 && `${stats.pendingWithdrawals} pending withdrawal(s)`} that need attention.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.investorCount} I · {stats.orgCount} O · {stats.associateCount} A
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending KYC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.pendingKYC}</div>
              <p className="text-xs text-muted-foreground">Awaiting verification</p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeInvestments}</div>
              <p className="text-xs text-muted-foreground">Total investment plans</p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">₦{stats.totalWalletBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All user balances</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingDeposits}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingWithdrawals}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Recent Users</CardTitle>
            <CardDescription className="text-sm">Latest registered users on the platform</CardDescription>
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
                  <TableHead className="whitespace-nowrap">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium whitespace-nowrap">{user.full_name || "Unknown"}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize whitespace-nowrap">
                        {user.base_structure || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize whitespace-nowrap">
                        {user.current_rank || "Unranked"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.kyc_status === "approved"
                            ? "bg-green-100 text-green-800"
                            : user.kyc_status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {user.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Pending KYC Applications</CardTitle>
            <CardDescription className="text-sm">Review and approve KYC submissions</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {pendingKYCUsers && pendingKYCUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingKYCUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap">{user.full_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.phone || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800 whitespace-nowrap">{user.kyc_status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No pending KYC applications</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
