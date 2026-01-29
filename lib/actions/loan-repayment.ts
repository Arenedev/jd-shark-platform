"use server"

import { createServiceRoleClient } from "@/lib/supabase/server"

export async function requestLoanRepaymentAction(
  loanId: string,
  userId: string,
  principalAmount: number,
  interestAccrued: number,
) {
  try {
    const supabase = createServiceRoleClient()

    console.log("[v0] Creating loan repayment request:", { loanId, userId, principalAmount, interestAccrued })

    const totalRepaymentAmount = principalAmount + interestAccrued

    // Create repayment request
    const { data: repaymentRequest, error } = await supabase
      .from("loan_repayment_requests")
      .insert({
        loan_id: loanId,
        user_id: userId,
        principal_amount: principalAmount,
        interest_accrued: interestAccrued,
        total_repayment_amount: totalRepaymentAmount,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Repayment request creation error:", error.message)
      throw new Error("Failed to create repayment request")
    }

    console.log("[v0] Repayment request created successfully:", repaymentRequest.id)

    return { success: true, repaymentRequest }
  } catch (error: any) {
    console.error("[v0] Loan repayment action error:", error.message || error)
    throw error
  }
}
