import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()

    // If no userId provided, update current user's rank
    const targetUserId = userId || user.id

    // Call the database function to update rank
    const { error: updateError } = await supabase.rpc("update_user_rank", {
      p_user_id: targetUserId,
    })

    if (updateError) {
      console.error("[v0] Rank update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch updated profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_rank, personal_capital, network_capital")
      .eq("id", targetUserId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rank: profile.current_rank,
      pc: profile.personal_capital,
      nc: profile.network_capital,
    })
  } catch (error: any) {
    console.error("[v0] Rank update route error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
