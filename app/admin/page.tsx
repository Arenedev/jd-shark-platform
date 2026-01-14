"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
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
  const [topEarners, setTopEarners] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push("/auth/login")
      return
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    if (!profile?.is_admin) {
      router.push("/dashboard")
      return
    }

    fetchData()
  }

  async function fetchData() {
    try {
      const [usersResult, walletsResult, investmentsResult, depositsResult, withdrawalsResult, earningsResult] =
        await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("wallets").select("balance"),
          supabase.from("investments").select("*"),
          supabase.from("deposit_requests").select("*").eq("status", "pending"),
          supabase.from("withdrawal_requests").select("*").eq("status", "pending"),
          supabase.from("mlm_earnings").select("user_id, amount, profiles!inner(full_name, email)"),
        ])

      const users = usersResult.data || []
      const wallets = walletsResult.data || []
      const investments = investmentsResult.data || []
      const deposits = depositsResult.data || []
      const withdrawals = withdrawalsResult.data || []
      const earnings = earningsResult.data || []

      // Calculate statistics
      const totalBalance = wallets.reduce((sum: number, w: any) => sum + (w.balance || 0), 0)
      const pendingKYC = users.filter((u: any) => u.kyc_status === "pending").length

      // Count by base structure
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

      // Calculate top earners
      const earningsByUser: { [key: string]: { name: string; email: string; total: number } } = {}
      earnings.forEach((earning: any) => {
        const userId = earning.user_id
        if (!earningsByUser[userId]) {
          earningsByUser[userId] = {
            name: earning.profiles?.full_name || "Unknown",
            email: earning.profiles?.email || "",
            total: 0,
          }
        }
        earningsByUser[userId].total += earning.amount
      })

      setTopEarners(
        Object.values(earningsByUser)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5),
      )
    } catch (error) {
      console.error("Error fetching admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform activity and manage users</p>
        </div>

        {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {stats.pendingDeposits > 0 && `${stats.pendingDeposits} pending deposit(s)`}
              {stats.pendingDeposits > 0 && stats.pendingWithdrawals > 0 && " and "}
              {stats.pendingWithdrawals > 0 && `${stats.pendingWithdrawals} pending withdrawal(s)`} that need attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="text-2xl font-bold">₦{stats.totalWalletBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All user balances</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Recent Users */}
        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest registered users on the platform</CardDescription>
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
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "Unknown"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.base_structure || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
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
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending KYC Applications */}
        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle>Pending KYC Applications</CardTitle>
            <CardDescription>Review and approve KYC submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingKYCUsers && pendingKYCUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingKYCUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800">{user.kyc_status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No pending KYC applications</p>
            )}
          </CardContent>
        </Card>

        {/* Top Earners */}
        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle>Top Earners</CardTitle>
            <CardDescription>Users with highest referral earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {topEarners.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEarners.map((earner: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{earner.name}</TableCell>
                      <TableCell>{earner.email}</TableCell>
                      <TableCell className="font-semibold text-secondary">₦{earner.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No earnings data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
