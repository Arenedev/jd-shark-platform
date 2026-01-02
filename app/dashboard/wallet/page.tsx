"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useTransactions } from "@/hooks/use-transactions"

export default function WalletPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const { transactions, loading: transactionsLoading } = useTransactions(userId)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/login")
        return
      }

      setUserId(session.user.id)
      setMounted(true)
    }

    checkAuth()
  }, [router])

  if (!mounted || profileLoading || transactionsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Error loading profile</div>
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">View and manage your wallet transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All your wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions && transactions.length > 0 ? (
                  transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell className="font-medium">₦{tx.amount.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{tx.status}</TableCell>
                      <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
