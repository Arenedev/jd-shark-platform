import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    if (!supabase) {
      console.error("[v0] Supabase client not initialized")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const { userId } = await request.json()

    if (!userId) {
      console.log("[v0] No userId provided for rank update")
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    console.log("[v0] Updating rank for user:", userId)

    // Call the database function to update rank
    const { error: updateError } = await supabase.rpc("update_user_rank", {
      p_user_id: userId,
    })

    if (updateError) {
      console.error("[v0] Rank update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch updated profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_rank, personal_capital, network_capital")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("[v0] Error fetching updated profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    console.log("[v0] Rank updated successfully for user:", userId, "New rank:", profile.current_rank)

    return NextResponse.json({
      success: true,
      rank: profile.current_rank,
      pc: profile.personal_capital,
      nc: profile.network_capital,
    })
  } catch (error: any) {
    console.error("[v0] Rank update route error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
