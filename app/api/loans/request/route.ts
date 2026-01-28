import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Use getSession() instead of getUser() - this works reliably in Route Handlers
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.error("[v0] No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user
    console.log("[v0] Processing loan request for user:", user.id)

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid loan amount" }, { status: 400 })
    }

    // Get user profile to check eligibility
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("base_structure, personal_capital, full_name, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile fetch error:", profileError?.message)
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
        { error: `Maximum loan amount is ₦${Math.floor(max_loan_amount).toLocaleString()}` },
        { status: 400 },
      )
    }

    if (amount < min_loan_amount) {
      return NextResponse.json(
        { error: `Minimum loan amount is ₦${Math.floor(min_loan_amount).toLocaleString()} (50% of portfolio)` },
        { status: 400 },
      )
    }

    // Calculate total due with 0.5% monthly interest for 12 months
    const monthlyRate = 0.005
    const months = 12
    const totalDue = amount * (1 + monthlyRate * months)

    console.log("[v0] Creating loan:", { userId: user.id, amount, totalDue })

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
      console.error("[v0] Loan creation error:", loanError?.message)
      return NextResponse.json({ error: "Failed to create loan request" }, { status: 500 })
    }

    console.log("[v0] Loan created successfully:", loan?.id)

    return NextResponse.json({ loan, success: true })
  } catch (error: any) {
    console.error("[v0] Loan request error:", error?.message || error)
    return NextResponse.json({ error: "Failed to process loan request" }, { status: 500 })
  }
}
