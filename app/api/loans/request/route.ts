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
      .select("base_structure, full_name, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile fetch error:", profileError?.message)
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }

    // Check if user is associate (eligible for loans)
    if (profile.base_structure !== "associate") {
      return NextResponse.json(
        { error: "Only associates are eligible for loans" },
        { status: 400 },
      )
    }

    // Check wallet balance as reference
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single()

    const availableBalance = wallet?.balance || 0
    const maxLoanAmount = availableBalance * 0.8
    const minLoanAmount = 10000 // Minimum loan amount

    if (amount > maxLoanAmount && maxLoanAmount > 0) {
      return NextResponse.json(
        { error: `Maximum loan amount is ₦${Math.floor(maxLoanAmount).toLocaleString()}` },
        { status: 400 },
      )
    }

    if (amount < minLoanAmount) {
      return NextResponse.json(
        { error: `Minimum loan amount is ₦${minLoanAmount.toLocaleString()}` },
        { status: 400 },
      )
    }

    // Calculate total due with 0.5% monthly interest for 12 months
    const monthlyRate = 0.005
    const months = 12
    const totalDue = amount * (1 + monthlyRate * months)
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + 12)

    console.log("[v0] Creating loan:", { userId: user.id, amount, totalDue })

    // Create loan request using the loans table
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .insert({
        user_id: user.id,
        amount,
        interest_rate: 0.5,
        tenure_months: 12,
        status: "active",
        due_date: dueDate.toISOString(),
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
