"use client"

import { useState, useEffect } from "react"
import { getUserReferrals, getUserMLMEarnings, getReferralStats } from "@/lib/api/referrals"
import { createBrowserClient } from "@/lib/supabase/client"

export function useReferrals() {
  const [referrals, setReferrals] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadReferralData() {
      try {
        setLoading(true)
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user?.id) {
          setError("No user session found")
          return
        }

        const [referralsData, earningsData, statsData] = await Promise.all([
          getUserReferrals(session.user.id),
          getUserMLMEarnings(session.user.id),
          getReferralStats(session.user.id),
        ])

        setReferrals(referralsData)
        setEarnings(earningsData)
        setStats(statsData)
        setError(null)
      } catch (err: any) {
        console.error("[v0] Error loading referral data:", err)
        setError(err.message || "Failed to load referral data")
      } finally {
        setLoading(false)
      }
    }

    loadReferralData()
  }, [])

  return { referrals, earnings, stats, loading, error }
}
