import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { checkAndUpdateRank } from "@/lib/earnings/rank-engine"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      console.log("[v0] No userId provided for rank update")
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    console.log("[v0] Updating rank for user:", userId)

    // Use the rank engine to check and update rank
    const result = await checkAndUpdateRank(userId)

    console.log("[v0] Rank update completed:", result)

    // Fetch updated profile
    const supabase = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_rank, personal_capital, network_capital")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("[v0] Error fetching updated profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rank: profile.current_rank,
      pc: profile.personal_capital,
      nc: profile.network_capital,
      result,
    })
  } catch (error: any) {
    console.error("[v0] Rank update route error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
