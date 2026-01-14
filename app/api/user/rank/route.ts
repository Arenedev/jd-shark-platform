import { type NextRequest, NextResponse } from "next/server"
import { checkAndUpdateRank, getRankConfigurations } from "@/lib/earnings/rank-engine"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ message: "User ID required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 })
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    // Get user's rank data
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("rank, base_structure, personal_capital, network_capital, grand_network_capital")
      .eq("id", userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Get rank configurations
    const rankConfigs = await getRankConfigurations()

    // Get current rank config
    const currentRankConfig = rankConfigs.find((r) => r.rank_name === profile.rank)

    // Find next rank
    const currentRankIndex = rankConfigs.findIndex((r) => r.rank_name === profile.rank)
    const nextRankConfig = currentRankIndex < rankConfigs.length - 1 ? rankConfigs[currentRankIndex + 1] : null

    // Calculate progress to next rank
    let progressToNextRank = 100
    if (nextRankConfig) {
      const pcProgress = Math.min(100, (profile.personal_capital / nextRankConfig.pc_requirement) * 100)
      const ncProgress = Math.min(100, (profile.network_capital / nextRankConfig.nc_requirement) * 100)
      progressToNextRank = Math.max(pcProgress, ncProgress)
    }

    return NextResponse.json({
      currentRank: profile.rank,
      baseStructure: profile.base_structure,
      personalCapital: profile.personal_capital,
      networkCapital: profile.network_capital,
      grandNetworkCapital: profile.grand_network_capital,
      currentRankConfig,
      nextRankConfig,
      progressToNextRank,
      allRanks: rankConfigs,
    })
  } catch (error) {
    console.error("Error fetching rank:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ message: "User ID required" }, { status: 400 })
    }

    const result = await checkAndUpdateRank(userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating rank:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
