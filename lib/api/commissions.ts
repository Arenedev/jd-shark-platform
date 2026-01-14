import { createClient } from "@/lib/supabase/client"

export interface Commission {
  id: string
  user_id: string
  source_user_id: string
  commission_type: string
  generation: number
  amount: number
  percentage_rate: number
  calculation_period: string
  status: string
  credited_at: string | null
  created_at: string
}

export interface CommissionSummary {
  totalEarned: number
  pendingCommissions: number
  creditedCommissions: number
  byType: {
    [key: string]: number
  }
  byGeneration: {
    [key: number]: number
  }
}

export async function getUserCommissions(userId: string, period?: string): Promise<Commission[]> {
  const supabase = createClient()

  let query = supabase.from("commissions").select("*").eq("user_id", userId).order("created_at", { ascending: false })

  if (period) {
    query = query.eq("calculation_period", period)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching commissions:", error)
    throw error
  }

  return data || []
}

export async function getCommissionSummary(userId: string): Promise<CommissionSummary> {
  const supabase = createClient()

  const { data: commissions, error } = await supabase.from("commissions").select("*").eq("user_id", userId)

  if (error) {
    console.error("[v0] Error fetching commission summary:", error)
    throw error
  }

  const summary: CommissionSummary = {
    totalEarned: 0,
    pendingCommissions: 0,
    creditedCommissions: 0,
    byType: {},
    byGeneration: {},
  }

  commissions?.forEach((c) => {
    summary.totalEarned += c.amount

    if (c.status === "pending") {
      summary.pendingCommissions += c.amount
    } else if (c.status === "credited") {
      summary.creditedCommissions += c.amount
    }

    // By type
    if (!summary.byType[c.commission_type]) {
      summary.byType[c.commission_type] = 0
    }
    summary.byType[c.commission_type] += c.amount

    // By generation
    if (c.generation) {
      if (!summary.byGeneration[c.generation]) {
        summary.byGeneration[c.generation] = 0
      }
      summary.byGeneration[c.generation] += c.amount
    }
  })

  return summary
}

export async function getCommissionRuns() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("monthly_commission_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(12)

  if (error) {
    console.error("[v0] Error fetching commission runs:", error)
    throw error
  }

  return data || []
}
