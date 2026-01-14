import { createClient } from "@/lib/supabase/client"

export interface LCRInvestment {
  id: string
  user_id: string
  amount: number
  lock_period_days: number
  bonus_interest_rate: number
  start_date: string
  maturity_date: string
  status: "active" | "matured" | "withdrawn"
  final_amount: number
  created_at: string
}

export async function createLCRInvestment(amount: number, lockPeriodDays: number): Promise<any> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Calculate bonus interest based on lock period
  let bonusInterestRate = 0
  if (lockPeriodDays >= 365) {
    bonusInterestRate = 10 // 10% for 1 year
  } else if (lockPeriodDays >= 180) {
    bonusInterestRate = 5 // 5% for 6 months
  } else if (lockPeriodDays >= 90) {
    bonusInterestRate = 2 // 2% for 3 months
  }

  const startDate = new Date()
  const maturityDate = new Date(startDate)
  maturityDate.setDate(maturityDate.getDate() + lockPeriodDays)

  const finalAmount = amount * (1 + bonusInterestRate / 100)

  const { data, error } = await supabase
    .from("lcr_investments")
    .insert({
      user_id: user.id,
      amount,
      lock_period_days: lockPeriodDays,
      bonus_interest_rate: bonusInterestRate,
      start_date: startDate.toISOString(),
      maturity_date: maturityDate.toISOString(),
      status: "active",
      final_amount: finalAmount,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLCRInvestments(): Promise<LCRInvestment[]> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("lcr_investments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function withdrawLCRInvestment(investmentId: string): Promise<any> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Get the investment
  const { data: investment, error: fetchError } = await supabase
    .from("lcr_investments")
    .select("*")
    .eq("id", investmentId)
    .eq("user_id", user.id)
    .single()

  if (fetchError) throw fetchError
  if (!investment) throw new Error("Investment not found")

  // Check if matured
  const now = new Date()
  const maturityDate = new Date(investment.maturity_date)
  if (now < maturityDate) {
    throw new Error("Investment has not matured yet")
  }

  // Update investment status
  const { error: updateError } = await supabase
    .from("lcr_investments")
    .update({ status: "withdrawn" })
    .eq("id", investmentId)

  if (updateError) throw updateError

  // Credit user wallet
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single()

  if (walletError) throw walletError

  const { error: balanceError } = await supabase
    .from("wallets")
    .update({ balance: (wallet.balance || 0) + investment.final_amount })
    .eq("user_id", user.id)

  if (balanceError) throw balanceError

  // Create transaction record
  await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    type: "credit",
    amount: investment.final_amount,
    description: `LCR Investment matured (₦${investment.amount.toLocaleString()} + ₦${(investment.final_amount - investment.amount).toLocaleString()} bonus)`,
    status: "completed",
  })

  return { success: true, amount: investment.final_amount }
}
