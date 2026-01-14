import { createClient } from "@/lib/supabase/client"

export interface Rank {
  id: string
  rank_name: string
  rank_order: number
  min_pc: number
  min_nc: number
  pc_roi_percentage: number
  nc_commission_percentage: number
  gnc_commission_percentage: number
  vnc_commission_percentage: number
  min_guaranteed_percentage: number
  welcome_bonus_multiplier: number
  special_perks: any
}

export interface NetworkStats {
  personalCapital: number
  networkCapital: number
  grandNetworkCapital: number
  currentRank: string
  nextRank: string | null
  progressToNextRank: number
  totalNetworkMembers: number
  directReferrals: number
  generations: { [key: number]: number }
}

export async function getRanks(): Promise<Rank[]> {
  const supabase = createClient()

  const { data, error } = await supabase.from("ranks").select("*").order("rank_order", { ascending: true })

  if (error) throw error
  return data || []
}

export async function getUserRank(userId: string): Promise<Rank | null> {
  const supabase = createClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rank_id")
    .eq("id", userId)
    .single()

  if (profileError || !profile?.rank_id) return null

  const { data: rank, error: rankError } = await supabase.from("ranks").select("*").eq("id", profile.rank_id).single()

  if (rankError) throw rankError
  return rank
}

export async function getNetworkStats(userId: string): Promise<NetworkStats> {
  const supabase = createClient()

  // Get PC, NC, and current rank
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("personal_capital, network_capital, current_rank, rank_id")
    .eq("id", userId)
    .single()

  if (profileError) throw profileError

  // Get network genealogy stats
  const { data: genealogy, error: genError } = await supabase
    .from("network_genealogy")
    .select("generation, user_id")
    .eq("root_id", userId)

  if (genError) throw genError

  // Count members by generation
  const generations: { [key: number]: number } = {}
  const uniqueMembers = new Set<string>()

  genealogy?.forEach((g) => {
    if (!generations[g.generation]) generations[g.generation] = 0
    generations[g.generation]++
    uniqueMembers.add(g.user_id)
  })

  // Get direct referrals count
  const { count: directCount } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", userId)

  // Get all ranks to determine next rank
  const { data: ranks } = await supabase.from("ranks").select("*").order("rank_order", { ascending: true })

  let nextRank: string | null = null
  let progressToNextRank = 100

  if (ranks && profile?.rank_id) {
    const currentRankIndex = ranks.findIndex((r) => r.id === profile.rank_id)
    if (currentRankIndex !== -1 && currentRankIndex < ranks.length - 1) {
      const nextRankData = ranks[currentRankIndex + 1]
      nextRank = nextRankData.rank_name

      // Calculate progress (based on PC or NC, whichever is closer)
      const pcProgress = (profile.personal_capital / nextRankData.min_pc) * 100
      const ncProgress = nextRankData.min_nc ? (profile.network_capital / nextRankData.min_nc) * 100 : 0
      progressToNextRank = Math.max(pcProgress, ncProgress)
    }
  }

  return {
    personalCapital: profile?.personal_capital || 0,
    networkCapital: profile?.network_capital || 0,
    grandNetworkCapital: 0, // Will be calculated for Grand Alpha+
    currentRank: profile?.current_rank || "Unranked",
    nextRank,
    progressToNextRank: Math.min(progressToNextRank, 100),
    totalNetworkMembers: uniqueMembers.size,
    directReferrals: directCount || 0,
    generations,
  }
}

export async function getRankHistory(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("rank_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateUserRank(userId: string): Promise<void> {
  const supabase = createClient()

  // Call the database function to update rank
  const { error } = await supabase.rpc("update_user_rank", {
    p_user_id: userId,
  })

  if (error) throw error
}
