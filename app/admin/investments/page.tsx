"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { checkAdminSession } from "@/lib/admin-auth"
import { TrendingUp, Calendar, DollarSign, Lock } from "lucide-react"

export default function AdminInvestmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [investments, setInvestments] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalInvestments: 0,
    totalPrincipal: 0,
    activeInvestments: 0,
    totalReturns: 0,
  })

  useEffect(() => {
    const isAuthenticated = checkAdminSession()
    if (!isAuthenticated) {
      router.push("/admin/login")
      return
    }

    fetchInvestments()
  }, [router])

  const fetchInvestments = async () => {
    try {
      const supabase = createBrowserClient()

      const { data: investmentsData } = await supabase
        .from("investments")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (investmentsData) {
        setInvestments(investmentsData)

        const totalPrincipal = investmentsData.reduce((sum, inv) => sum + (inv.principal || 0), 0)
        const activeCount = investmentsData.filter((inv) => inv.status === "active").length
        const totalReturns = investmentsData.reduce((sum, inv) => sum + (inv.total_returns || 0), 0)

        setStats({
          totalInvestments: investmentsData.length,
          totalPrincipal,
          activeInvestments: activeCount,
          totalReturns,
        })
      }
    } catch (error) {
      console.error("Error fetching investments:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading investments...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Investments Overview</h1>
          <p className="text-muted-foreground mt-2">Monitor all investment activities</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvestments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Principal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPrincipal)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeInvestments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalReturns)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Investments</CardTitle>
            <CardDescription>Complete list of user investments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Principal</th>
                    <th className="text-left p-4 font-medium">Lock Type</th>
                    <th className="text-left p-4 font-medium">ROI</th>
                    <th className="text-left p-4 font-medium">Returns</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-muted-foreground">
                        No investments found
                      </td>
                    </tr>
                  ) : (
                    investments.map((investment) => (
                      <tr key={investment.id} className="border-b hover:bg-accent/5">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{investment.profiles?.full_name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{investment.profiles?.email}</div>
                          </div>
                        </td>
                        <td className="p-4 font-medium">{formatCurrency(investment.principal || 0)}</td>
                        <td className="p-4">
                          <Badge variant={investment.lock_type === "none" ? "secondary" : "default"}>
                            {investment.lock_type === "none"
                              ? "No Lock"
                              : investment.lock_type === "1_year"
                                ? "1 Year"
                                : "10 Years"}
                          </Badge>
                        </td>
                        <td className="p-4">{investment.effective_roi || 0}%</td>
                        <td className="p-4">{formatCurrency(investment.total_returns || 0)}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              investment.status === "active"
                                ? "default"
                                : investment.status === "matured"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {investment.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(investment.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
