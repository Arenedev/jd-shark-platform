import { createBrowserClient } from "@/lib/supabase/client"

export async function getUserInvestments(userId: string) {
  const supabase = createBrowserClient()

  // Get user's portfolios first
  const { data: portfolios, error: portfolioError } = await supabase
    .from("portfolios")
    .select("id")
    .eq("current_owner_id", userId)

  if (portfolioError) {
    console.error("[v0] Error fetching user portfolios:", portfolioError)
    throw portfolioError
  }

  const portfolioIds = portfolios?.map((p) => p.id) || []

  if (portfolioIds.length === 0) {
    return []
  }

  // Get investments for these portfolios
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .in("portfolio_id", portfolioIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching investments:", error)
    throw error
  }

  return data || []
}

export async function getInvestmentsByPortfolio(portfolioId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching portfolio investments:", error)
    throw error
  }

  return data || []
}

export async function createInvestment(investmentData: {
  portfolio_id: string
  amount: number
  start_date: string
  maturity_date: string
  roi_percentage: number
  auto_reinvest: boolean
}) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("investments")
    .insert([{ ...investmentData, status: "active" }])
    .select()

  if (error) {
    console.error("[v0] Error creating investment:", error)
    throw error
  }

  return data?.[0] || null
}
