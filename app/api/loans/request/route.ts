import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, purpose } = body

    // Check eligibility
    const { data: eligibility } = await supabase.rpc("calculate_loan_eligibility", { p_user_id: user.id })

    const eligible = eligibility?.[0]

    if (!eligible?.eligible) {
      return NextResponse.json({ error: "Only Organizations are eligible for loans" }, { status: 400 })
    }

    if (amount > eligible.max_loan_amount) {
      return NextResponse.json(
        { error: `Maximum loan amount is ₦${eligible.max_loan_amount.toLocaleString()}` },
        { status: 400 },
      )
    }

    // Calculate total due with 0.5% monthly interest
    const monthlyRate = 0.005
    const months = 12 // Standard 1 year loan
    const totalDue = amount * (1 + monthlyRate * months)

    // Create loan request
    const { data: loan, error: loanError } = await supabase
      .from("organization_loans")
      .insert({
        organization_id: user.id,
        principal_amount: amount,
        monthly_interest_rate: 0.5,
        total_due: totalDue,
        status: "pending",
      })
      .select()
      .single()

    if (loanError) throw loanError

    return NextResponse.json({ loan })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create loan request" }, { status: 500 })
  }
}
