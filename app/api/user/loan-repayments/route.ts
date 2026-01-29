import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

// Generate a unique payment reference code
function generatePaymentCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `JDS-${timestamp}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loanId, userId, amount, principalAmount, interestAccrued } = body

    if (!loanId || !userId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Processing repayment for loan:", loanId)

    // Generate unique payment reference code
    const paymentCode = generatePaymentCode()
    console.log("[v0] Generated payment code:", paymentCode)

    // Create repayment request record using service role client
    const supabase = createServiceRoleClient()

    const { data: repayment, error: repaymentError } = await supabase
      .from("loan_repayment_requests")
      .insert({
        loan_id: loanId,
        user_id: userId,
        principal_amount: Number.parseFloat(principalAmount),
        interest_accrued: Number.parseFloat(interestAccrued),
        total_repayment_amount: Number.parseFloat(amount),
        payment_reference_code: paymentCode,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (repaymentError) {
      console.error("[v0] Repayment creation error:", repaymentError.message)
      throw new Error("Failed to create repayment request")
    }

    console.log("[v0] Repayment request created:", repayment?.id)

    return NextResponse.json({
      success: true,
      repayment,
      paymentCode,
      message: "Repayment request submitted successfully",
    })
  } catch (error: any) {
    console.error("[v0] User repayment API error:", error.message || error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
