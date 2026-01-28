import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the user from the request headers (for server-side auth context)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[v0] Auth error:", authError?.message)
      return NextResponse.json({ error: "Auth session missing" }, { status: 401 })
    }

    if (!user) {
      console.error("[v0] No user in auth context")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Processing loan request for user:", user.id)

    const body = await request.json()
    const { amount } = body

    // Get user profile to check eligibility
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("base_structure, personal_capital, full_name, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile fetch error:", profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }

    if (profile.base_structure !== "organization") {
      return NextResponse.json({ error: "Only Organizations are eligible for loans" }, { status: 400 })
    }

    const portfolio_value = profile.personal_capital || 0
    const max_loan_amount = portfolio_value * 0.8
    const min_loan_amount = portfolio_value * 0.5

    if (amount > max_loan_amount) {
      return NextResponse.json(
        { error: `Maximum loan amount is ₦${max_loan_amount.toLocaleString()}` },
        { status: 400 },
      )
    }

    if (amount < min_loan_amount) {
      return NextResponse.json(
        { error: `Minimum loan amount is ₦${min_loan_amount.toLocaleString()} (50% of portfolio)` },
        { status: 400 },
      )
    }

    // Calculate total due with 0.5% monthly interest for 12 months
    const monthlyRate = 0.005
    const months = 12
    const totalDue = amount * (1 + monthlyRate * months)

    console.log("[v0] Loan request details:", { amount, monthlyRate, months, totalDue })

    // Create loan request
    const { data: loan, error: loanError } = await supabase
      .from("organization_loans")
      .insert({
        user_id: user.id,
        principal_amount: amount,
        monthly_interest_rate: 0.5,
        total_due: totalDue,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (loanError) {
      console.error("[v0] Loan creation error:", loanError)
      throw loanError
    }

    console.log("[v0] Loan created successfully:", loan)

    return NextResponse.json({ loan, success: true })
  } catch (error: any) {
    console.error("[v0] Loan request error:", error)
    return NextResponse.json({ error: error.message || "Failed to create loan request" }, { status: 500 })
  }
}
