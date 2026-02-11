import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    // Use service role client - the admin page already has authentication checks
    const supabase = createServiceRoleClient()

    // Fetch all loans with user profile details
    const { data: loans, error } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Loans fetch error:", error.message)
      throw error
    }

    console.log("[v0] Fetched loans:", loans?.length || 0)
    return NextResponse.json({ loans: loans || [] })
  } catch (error: any) {
    console.error("[v0] Admin loans API error:", error.message || error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
