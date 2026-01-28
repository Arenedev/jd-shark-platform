import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    // Add await here - createClient() is async!
    const supabase = await createClient()

    // Verify admin session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!adminProfile) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 })
    }

    // Fetch all loans with user profile details
    const { data: loans, error } = await supabase
      .from("organization_loans")
      .select(
        `
        id,
        user_id,
        principal_amount,
        interest_rate,
        monthly_interest,
        total_due,
        repaid_amount,
        status,
        approved_at,
        maturity_date,
        created_at,
        profiles:user_id (
          id,
          full_name,
          email,
          base_structure,
          personal_capital
        )
      `
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Loans fetch error:", error)
      throw error
    }

    console.log("[v0] Fetched loans:", loans?.length || 0)
    return NextResponse.json({ loans: loans || [] })
  } catch (error: any) {
    console.error("[v0] Admin loans API error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
