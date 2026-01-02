import { createBrowserClient } from "@/lib/supabase/client"

export async function getUserPortfolios(userId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("current_owner_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching portfolios:", error)
    throw error
  }

  return data || []
}

export async function getPortfolioById(portfolioId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("portfolios").select("*").eq("id", portfolioId)

  if (error) {
    console.error("[v0] Error fetching portfolio:", error)
    throw error
  }

  return data?.[0] || null
}

export async function createPortfolio(portfolioData: {
  name: string
  portfolio_type: string
  purpose: string
  owner_id: string
  current_owner_id: string
}) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("portfolios").insert([portfolioData]).select()

  if (error) {
    console.error("[v0] Error creating portfolio:", error)
    throw error
  }

  return data?.[0] || null
}

export async function updatePortfolio(portfolioId: string, updates: any) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.from("portfolios").update(updates).eq("id", portfolioId).select()

  if (error) {
    console.error("[v0] Error updating portfolio:", error)
    throw error
  }

  return data?.[0] || null
}
