import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching withdrawals:", error)
      return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Withdrawal list API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
