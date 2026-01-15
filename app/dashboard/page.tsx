"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import WalletOverview from "@/components/dashboard/wallet-overview"
import RecentActivity from "@/components/dashboard/recent-activity"
import QuickActions from "@/components/dashboard/quick-actions"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useWallet } from "@/hooks/use-wallet"
import { useTransactions } from "@/hooks/use-transactions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUserBalances } from "@/lib/api/balances"

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const { wallet, loading: walletLoading } = useWallet(userId)
  const { transactions, loading: transactionsLoading } = useTransactions(userId)
  const [balances, setBalances] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession()

          if (sessionError || !session) {
            router.push("/auth/login")
            return
          }

          setUserId(session.user.id)
          setMounted(true)
          return
        }

        setUserId(user.id)
        setMounted(true)
      } catch (err) {
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const loadBalances = async () => {
      if (userId) {
        try {
          const userBalances = await getUserBalances(userId)
          setBalances(userBalances)
        } catch (error) {
          console.error("[v0] Error loading balances:", error)
        }
      }
    }

    if (userId) {
      loadBalances()
    }
  }, [userId])

  if (loading || !mounted || profileLoading || walletLoading || transactionsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Error loading profile</div>
  }

  const recentTransactions = transactions.slice(0, 5)

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {profile.full_name}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Account Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-sm sm:text-lg capitalize">
                {profile.base_structure || "Not Set"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Current Rank</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm sm:text-lg capitalize">
                {profile.current_rank || "Unranked"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Personal Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">₦{(balances?.personalCapital || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Locked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Returns Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                ₦{(balances?.returnsBalance || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Withdrawable</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                ₦{(balances?.totalReturnsEarned || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                ₦{(balances?.availableForWithdrawal || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">To withdraw</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <WalletOverview wallet={wallet} profile={profile} />
            <QuickActions userId={profile.id} />
          </div>
          <RecentActivity transactions={recentTransactions} />
        </div>
      </div>
    </DashboardLayout>
  )
}
