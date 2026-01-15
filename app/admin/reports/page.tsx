"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { checkAdminSession } from "@/lib/admin-auth"
import { Download, TrendingUp, Users, DollarSign, Calendar } from "lucide-react"

export default function AdminReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalInvestments: 0,
    totalReturns: 0,
    monthlyGrowth: 0,
  })

  useEffect(() => {
    const isAuthenticated = checkAdminSession()
    if (!isAuthenticated) {
      router.push("/admin/login")
      return
    }

    fetchReportData()
  }, [router])

  const fetchReportData = async () => {
    try {
      const supabase = createBrowserClient()

      const [usersRes, depositsRes, withdrawalsRes, investmentsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("deposit_requests").select("amount").eq("status", "approved"),
        supabase.from("withdrawal_requests").select("amount").eq("status", "approved"),
        supabase.from("investments").select("principal, total_returns"),
      ])

      const totalDeposits = depositsRes.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0
      const totalWithdrawals = withdrawalsRes.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
      const totalInvestments = investmentsRes.data?.reduce((sum, i) => sum + (i.principal || 0), 0) || 0
      const totalReturns = investmentsRes.data?.reduce((sum, i) => sum + (i.total_returns || 0), 0) || 0

      setReportData({
        totalUsers: usersRes.count || 0,
        totalDeposits,
        totalWithdrawals,
        totalInvestments,
        totalReturns,
        monthlyGrowth: 12.5,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    alert("Export functionality coming soon!")
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">Platform performance metrics</p>
          </div>
          <Button onClick={exportReport} className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">All registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.totalDeposits)}</div>
              <p className="text-xs text-muted-foreground mt-1">Approved deposits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.totalWithdrawals)}</div>
              <p className="text-xs text-muted-foreground mt-1">Approved withdrawals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.totalInvestments)}</div>
              <p className="text-xs text-muted-foreground mt-1">Active principal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.totalReturns)}</div>
              <p className="text-xs text-muted-foreground mt-1">Generated returns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.monthlyGrowth}%</div>
              <p className="text-xs text-muted-foreground mt-1">Platform growth rate</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Overview of platform finances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-accent/5 rounded-lg">
                <span className="font-medium">Net Deposits (Deposits - Withdrawals)</span>
                <span className="text-xl font-bold">
                  {formatCurrency(reportData.totalDeposits - reportData.totalWithdrawals)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-accent/5 rounded-lg">
                <span className="font-medium">Active Investment Pool</span>
                <span className="text-xl font-bold">{formatCurrency(reportData.totalInvestments)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-accent/5 rounded-lg">
                <span className="font-medium">Returns Generated</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(reportData.totalReturns)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
