import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[v0] Missing Supabase credentials")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] Fetching admin stats...")

    const [usersResult, walletsResult, investmentsResult, depositsResult, withdrawalsResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("balance"),
      supabase.from("investments").select("*"),
      supabase.from("deposit_requests").select("*").eq("status", "pending"),
      supabase.from("withdrawal_requests").select("*").eq("status", "pending"),
    ])

    console.log("[v0] Users result:", usersResult.error || `${usersResult.data?.length} users`)
    console.log("[v0] Wallets result:", walletsResult.error || `${walletsResult.data?.length} wallets`)

    if (usersResult.error) {
      console.error("[v0] Error fetching users:", usersResult.error)
    }
    if (walletsResult.error) {
      console.error("[v0] Error fetching wallets:", walletsResult.error)
    }

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

    const stats = {
      totalUsers: users.length,
      pendingKYC,
      activeInvestments: investments.length,
      totalWalletBalance: totalBalance,
      pendingDeposits: deposits.length,
      pendingWithdrawals: withdrawals.length,
      investorCount,
      orgCount,
      associateCount,
    }

    const recentUsers = users.slice(0, 5)
    const pendingKYCUsers = users.filter((u: any) => u.kyc_status === "pending").slice(0, 10)

    return NextResponse.json({
      stats,
      recentUsers,
      pendingKYCUsers,
    })
  } catch (error: any) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
