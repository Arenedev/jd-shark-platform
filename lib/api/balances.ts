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

  // Get PC from investments table - sum of all approved and active investment amounts (total invested)
  const { data: investments, error: investError } = await supabase
    .from("investments")
    .select("amount, principal, status")
    .eq("user_id", userId)
    .in("status", ["approved", "active", "matured"])

  console.log("[v0] Investments fetched:", investments?.length, investments)

  // PC = sum of investment amounts (actual invested across all portfolios)
  const personalCapital = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0

  // Get locked capital (principal in active investments)
  const lockedCapital = investments
    ?.filter((inv) => inv.status === "active")
    .reduce((sum, inv) => sum + (inv.principal || inv.amount || 0), 0) || 0

  console.log("[v0] PC calculation from investments:", { personalCapital, lockedCapital })

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

  console.log("[v0] Balance calculation:", { personalCapital, lockedCapital, totalReturnsEarned, returnsBalance })

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
