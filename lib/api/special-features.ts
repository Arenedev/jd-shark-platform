import { createClient } from "@/lib/supabase/client"

export interface OrganizationLoan {
  id: string
  user_id: string
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

  // First, check if user is an organization
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("base_structure, personal_capital")
    .eq("id", userId)
    .single()

  if (profileError) {
    console.error("[v0] Profile fetch error:", profileError)
    throw profileError
  }

  console.log("[v0] User profile:", { base_structure: profileData?.base_structure, personal_capital: profileData?.personal_capital })

  if (profileData?.base_structure !== "organization") {
    console.log("[v0] User is not an organization:", profileData?.base_structure)
    return { eligible: false, max_loan_amount: 0, investment_portfolio_value: 0 }
  }

  const portfolio_value = profileData?.personal_capital || 0
  const max_loan_amount = portfolio_value * 0.8

  console.log("[v0] Loan eligibility calculated:", { eligible: true, max_loan_amount, portfolio_value })

  return { eligible: true, max_loan_amount, investment_portfolio_value: portfolio_value }
}

export async function getUserLoans(userId: string): Promise<OrganizationLoan[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("organization_loans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching organization loans:", error)
    return []
  }
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
