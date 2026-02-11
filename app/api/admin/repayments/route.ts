import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Fetch all loan repayments with loan and user details
    const { data: repayments, error } = await supabase
      .from("loan_repayments")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Repayment requests fetch error:", error.message)
      throw error
    }

    console.log("[v0] Fetched repayment requests:", repayments?.length || 0)
    return NextResponse.json({ repayments: repayments || [] })
  } catch (error: any) {
    console.error("[v0] Admin repayments API error:", error.message || error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
