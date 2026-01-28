import { createClient } from "@/lib/supabase/client"

export interface OrganizationLoan {
  id: string
  organization_id: string
  principal_amount: number
  monthly_interest_rate: number
  total_due: number
  amount_paid: number
  status: string
  approved_at: string | null
  due_date: string | null
  created_at: string
}

export interface WelcomeBonus {
  id: string
  user_id: string
  rank_name: string
  bonus_amount: number
  bonus_type: string
  status: string
  credited_at: string | null
  created_at: string
}

export interface Incentive {
  id: string
  user_id: string
  incentive_type: string
  title: string
  description: string | null
  value_amount: number | null
  status: string
  awarded_at: string | null
  claimed_at: string | null
  created_at: string
}

export async function checkLoanEligibility(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc("calculate_loan_eligibility", { p_user_id: userId })

  if (error) throw error
  return data?.[0] || { eligible: false, max_loan_amount: 0, investment_portfolio_value: 0 }
}

export async function getUserLoans(userId: string): Promise<OrganizationLoan[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("organization_loans")
    .select("*")
    .eq("organization_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserBonuses(userId: string): Promise<WelcomeBonus[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("welcome_bonuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserIncentives(userId: string): Promise<Incentive[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("incentives")
    .select("id, user_id, incentive_type, title, description, value_amount, status, awarded_at, claimed_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching incentives:", error)
    throw error
  }
  return data || []
}
