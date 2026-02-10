import { createClient } from "@/lib/supabase/client"

export interface UserBalances {
  userId: string
  personalCapital: number // PC = sum of approved principals
  lockedCapital: number // Principal locked in active investments
  totalReturnsEarned: number // Sum of all return records
  returnsBalance: number // Returns available for withdrawal
  walletBalance: number // Total wallet balance
  availableForWithdrawal: number // Returns balance minus pending withdrawals
  pendingWithdrawals: number
}

export async function getUserBalances(userId: string): Promise<UserBalances> {
  const supabase = createClient()

  // First, get personal_capital and network_capital from profiles table (updated source of truth)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("personal_capital, network_capital")
    .eq("id", userId)
    .single()

  // Use profile personal_capital if available, otherwise calculate from investments
  let personalCapital = profile?.personal_capital || 0

  // Get locked capital (principal in active investments) - still calculated from investments
  const { data: investments, error: investError } = await supabase
    .from("investments")
    .select(
      `
      id,
      principal, 
      amount, 
      status,
      user_id,
      portfolio_id,
      portfolios!inner(current_owner_id)
    `
    )
    .eq("portfolios.current_owner_id", userId)
    .in("status", ["approved", "active", "matured", "pending"])

  console.log("[v0] Investments fetched for user:", userId, "count:", investments?.length)

  const lockedCapital = investments
    ?.filter((inv) => inv.status === "active")
    .reduce((sum, inv) => sum + (inv.principal || inv.amount || 0), 0) || 0

  console.log("[v0] PC from profiles table:", personalCapital, "Locked capital:", lockedCapital)

  // Get total returns earned
  const { data: returns, error: returnsError } = await supabase
    .from("monthly_returns")
    .select("return_amount")
    .eq("user_id", userId)
    .eq("credited_to_wallet", true)

  const totalReturnsEarned = returns?.reduce((sum, ret) => sum + (ret.return_amount || 0), 0) || 0

  // Get approved withdrawals (already deducted from returns)
  const { data: withdrawals, error: withdrawError } = await supabase
    .from("withdrawal_requests")
    .select("amount, status")
    .eq("user_id", userId)

  const approvedWithdrawals =
    withdrawals?.filter((w) => w.status === "approved").reduce((sum, w) => sum + w.amount, 0) || 0
  const pendingWithdrawals =
    withdrawals?.filter((w) => w.status === "pending").reduce((sum, w) => sum + w.amount, 0) || 0

  // Calculate returns balance (returns - approved withdrawals)
  const returnsBalance = totalReturnsEarned - approvedWithdrawals

  // Get wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, returns_balance")
    .eq("user_id", userId)
    .single()

  const walletBalance = wallet?.balance || 0
  const availableForWithdrawal = returnsBalance - pendingWithdrawals

  console.log("[v0] Balance calculation final:", { personalCapital, lockedCapital, totalReturnsEarned, returnsBalance })

  return {
    userId,
    personalCapital,
    lockedCapital,
    totalReturnsEarned,
    returnsBalance,
    walletBalance,
    availableForWithdrawal: Math.max(0, availableForWithdrawal),
    pendingWithdrawals,
  }
}

export async function canWithdraw(userId: string, amount: number): Promise<{ canWithdraw: boolean; reason?: string }> {
  const balances = await getUserBalances(userId)

  if (amount > balances.availableForWithdrawal) {
    return {
      canWithdraw: false,
      reason: `Insufficient returns balance. Available: ₦${balances.availableForWithdrawal.toLocaleString()}`,
    }
  }

  return { canWithdraw: true }
}
