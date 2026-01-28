"use server"

import { createClient } from "@/lib/supabase/server"

export async function requestLoanAction(amount: number) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized - please log in")
    }

    console.log("[v0] Processing loan request for user:", user.id)

    if (!amount || amount <= 0) {
      throw new Error("Invalid loan amount")
    }

    // Get user profile to check eligibility
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("base_structure, personal_capital, full_name, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile fetch error:", profileError?.message)
      throw new Error("User profile not found")
    }

    if (profile.base_structure !== "organization") {
      throw new Error("Only Organizations are eligible for loans")
    }

    const portfolio_value = profile.personal_capital || 0
    const max_loan_amount = portfolio_value * 0.8
    const min_loan_amount = portfolio_value * 0.5

    if (amount > max_loan_amount) {
      throw new Error(`Maximum loan amount is ₦${Math.floor(max_loan_amount).toLocaleString()}`)
    }

    if (amount < min_loan_amount) {
      throw new Error(`Minimum loan amount is ₦${Math.floor(min_loan_amount).toLocaleString()} (50% of portfolio)`)
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
      throw new Error("Failed to create loan request")
    }

    console.log("[v0] Loan created successfully:", loan?.id)

    return { success: true, loan }
  } catch (error: any) {
    console.error("[v0] Loan request error:", error?.message || error)
    throw error
  }
}
