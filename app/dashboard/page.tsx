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

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const { wallet, loading: walletLoading } = useWallet(userId)
  const { transactions, loading: transactionsLoading } = useTransactions(userId)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log("[v0] Dashboard auth check - session:", session ? "exists" : "none", "error:", error?.message)

        if (error || !session) {
          console.log("[v0] No valid session, redirecting to login")
          router.push("/auth/login")
          return
        }

        console.log("[v0] Session valid, user ID:", session.user.id)
        setUserId(session.user.id)
        setMounted(true)
      } catch (err) {
        console.error("[v0] Auth check error:", err)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading || !mounted || profileLoading || walletLoading || transactionsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Error loading profile</div>
  }

  const recentTransactions = transactions.slice(0, 5)

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <WalletOverview wallet={wallet} profile={profile} />
            <QuickActions userId={profile.id} />
          </div>
          <RecentActivity transactions={recentTransactions} />
        </div>
      </div>
    </DashboardLayout>
  )
}
