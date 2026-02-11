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
      supabase.from("wallets").select("*"),
      supabase.from("investments").select("*"),
      supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
    ])

    console.log("[v0] Users result:", usersResult.error || `${usersResult.data?.length} users`)
    console.log("[v0] Deposits result:", depositsResult.error || `${depositsResult.data?.length} deposits`)
    console.log("[v0] Wallets result:", walletsResult.error || `${walletsResult.data?.length} wallets`)

    let depositsWithProfiles = []
    if (depositsResult.data && usersResult.data) {
      depositsWithProfiles = depositsResult.data.map((deposit: any) => {
        const userProfile = usersResult.data.find((u: any) => u.id === deposit.user_id)
        return {
          ...deposit,
          user: userProfile
            ? {
                id: userProfile.id,
                full_name: userProfile.full_name,
                email: userProfile.email,
                base_structure: userProfile.base_structure,
              }
            : null,
        }
      })
      console.log("[v0] Successfully joined deposits with user profiles:", depositsWithProfiles.length)
    }

    let withdrawalsWithProfiles = []
    if (withdrawalsResult.data && usersResult.data) {
      withdrawalsWithProfiles = withdrawalsResult.data.map((withdrawal: any) => {
        const userProfile = usersResult.data.find((u: any) => u.id === withdrawal.user_id)
        return {
          ...withdrawal,
          user: userProfile
            ? {
                id: userProfile.id,
                full_name: userProfile.full_name,
                email: userProfile.email,
                base_structure: userProfile.base_structure,
              }
            : null,
        }
      })
    }

    if (usersResult.error) {
      console.error("[v0] Error fetching users:", usersResult.error)
    }
    if (walletsResult.error) {
      console.error("[v0] Error fetching wallets:", walletsResult.error)
    }
    if (depositsResult.error) {
      console.error("[v0] Error fetching deposits:", depositsResult.error)
    }

    const users = usersResult.data || []
    const wallets = walletsResult.data || []
    const investments = investmentsResult.data || []

    const totalBalance = wallets.reduce((sum: number, w: any) => sum + (w.balance || 0), 0)
    const pendingKYC = users.filter((u: any) => u.kyc_status === "pending").length

    const investorCount = users.filter((u: any) => u.base_structure === "investor").length
    const orgCount = users.filter((u: any) => u.base_structure === "organization").length
    const associateCount = users.filter((u: any) => u.base_structure === "associate").length

    console.log("[v0] Base structure counts:", { investorCount, orgCount, associateCount })

    const stats = {
      totalUsers: users.length,
      pendingKYC,
      activeInvestments: investments.length,
      totalWalletBalance: totalBalance,
      pendingDeposits: depositsWithProfiles.filter((d: any) => d.status === "pending").length,
      pendingWithdrawals: withdrawalsWithProfiles.filter((w: any) => w.status === "pending").length,
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
      users,
      wallets,
      deposits: depositsWithProfiles,
      withdrawals: withdrawalsWithProfiles,
    })
  } catch (error: any) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
