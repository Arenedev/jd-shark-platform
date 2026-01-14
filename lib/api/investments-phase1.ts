import { createBrowserClient } from "@/lib/supabase/client"

export interface Investment {
  id: string
  user_id: string
  deposit_request_id: string
  principal: number
  approved_at: string
  returns_start_at: string
  lock_type: "none" | "1_year" | "10_year"
  base_roi: number
  lcr_bonus: number
  effective_roi: number
  status: string
  total_returns: number
  last_return_date: string | null
  next_return_date: string | null
  created_at: string
  updated_at: string
}

export interface MonthlyReturn {
  id: string
  investment_id: string
  user_id: string
  return_period_month: number
  return_period_year: number
  principal_amount: number
  roi_rate: number
  return_amount: number
  credited_to_wallet: boolean
  credited_at: string | null
  created_at: string
}

// Get system configuration
export async function getSystemConfig(key: string): Promise<string | null> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("system_config").select("config_value").eq("config_key", key).single()

  if (error) {
    console.error("[v0] Error fetching system config:", error)
    return null
  }

  return data?.config_value || null
}

// Get user's investments
export async function getUserInvestments(userId: string): Promise<Investment[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching investments:", error)
    return []
  }

  return data || []
}

// Get monthly returns for an investment
export async function getInvestmentReturns(investmentId: string): Promise<MonthlyReturn[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("monthly_returns")
    .select("*")
    .eq("investment_id", investmentId)
    .order("return_period_year", { ascending: false })
    .order("return_period_month", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching returns:", error)
    return []
  }

  return data || []
}

// Calculate effective ROI based on lock type
export function calculateEffectiveROI(
  baseROI: number,
  lockType: "none" | "1_year" | "10_year",
): {
  effectiveROI: number
  lcrBonus: number
} {
  let lcrBonus = 0

  if (lockType === "1_year") {
    lcrBonus = 5.0
  } else if (lockType === "10_year") {
    lcrBonus = 10.0
  }

  return {
    effectiveROI: baseROI + lcrBonus,
    lcrBonus,
  }
}

// Calculate monthly return amount
export function calculateMonthlyReturn(principal: number, roiRate: number): number {
  return (principal * roiRate) / 100
}

// Calculate returns start date (4 months after approval)
export function calculateReturnsStartDate(approvedAt: Date): Date {
  const startDate = new Date(approvedAt)
  startDate.setMonth(startDate.getMonth() + 4)
  return startDate
}
