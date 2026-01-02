"use client"

import { useState } from "react"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { mockUsers, mockMLMEarnings, mockInvestments } from "@/lib/mock-data"

export default function AdminDashboard() {
  const [isAuthenticated] = useState(true)

  // Calculate statistics from mock data
  const totalUsers = mockUsers.length
  const pendingKYC = mockUsers.filter((u) => u.kyc_status === "pending").length
  const totalInvestments = mockInvestments.length
  const recentUsers = mockUsers.slice(0, 5)
  const kycPending = mockUsers.filter((u) => u.kyc_status === "pending").slice(0, 10)

  // Calculate top earners
  const earningsByUser: { [key: string]: { name: string; email: string; total: number } } = {}
  mockMLMEarnings.forEach((earning) => {
    const user = mockUsers.find((u) => u.id === earning.user_id)
    if (user) {
      if (!earningsByUser[earning.user_id]) {
        earningsByUser[earning.user_id] = {
          name: user.full_name || "Unknown",
          email: user.email || "",
          total: 0,
        }
      }
      earningsByUser[earning.user_id].total += earning.amount
    }
  })

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform activity and manage users</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Active users on platform</p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending KYC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{pendingKYC}</div>
              <p className="text-xs text-muted-foreground">Awaiting verification</p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalInvestments}</div>
              <p className="text-xs text-muted-foreground">Total investment plans</p>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Active wallet accounts</p>
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
            {kycPending && kycPending.length > 0 ? (
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
                  {kycPending.map((user: any) => (
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
            {Object.keys(earningsByUser).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(earningsByUser)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 5)
                    .map((earner: any, idx: number) => (
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
